// newsletter-automation.js
// Sistema completo para generar y enviar un newsletter semanal de desarrollo usando IA

// Importar dependencias
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const { marked } = require('marked');
const cron = require('node-cron');

// Importar Headers de node-fetch para compatibilidad con Resend
const nodeFetch = require('node-fetch');
global.fetch = nodeFetch;
global.Headers = nodeFetch.Headers;
global.Request = nodeFetch.Request;
global.Response = nodeFetch.Response;

const { Resend } = require('resend');

// Cargar variables de entorno
dotenv.config();

// Configuración de APIs y servicios
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'; // Dirección de correo corregida
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');

// Verificar si existe el archivo de suscriptores, si no, crearlo
if (!fs.existsSync(SUBSCRIBERS_FILE)) {
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify({ subscribers: [] }));
}

// Inicializar cliente de Resend
const resend = new Resend(RESEND_API_KEY);

// Función para enviar email con Resend con manejo mejorado de errores
async function sendEmail(to, subject, html) {
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: subject,
      html: html
    });
    
    return data;
  } catch (error) {
    console.error('Error enviando email con Resend:');
    
    // Mejorar el registro de errores para facilitar la depuración
    if (error.response) {
      console.error('Código de estado:', error.response.status);
      
      // Intentar mostrar el cuerpo de la respuesta de forma segura
      if (error.response.data) {
        if (typeof error.response.data === 'string') {
          console.error('Respuesta (primeros 200 caracteres):', error.response.data.substring(0, 200));
        } else {
          console.error('Datos de respuesta:', JSON.stringify(error.response.data));
        }
      }
    } else {
      console.error(error.message || error);
    }
    
    throw error;
  }
}

// Función para implementar reintentos en el envío de emails
async function sendEmailWithRetry(to, subject, html, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await sendEmail(to, subject, html);
    } catch (error) {
      retries++;
      console.log(`Intento ${retries}/${maxRetries} fallido. Reintentando en ${Math.pow(2, retries)} segundos...`);
      
      if (retries >= maxRetries) {
        console.error(`Máximo de reintentos (${maxRetries}) alcanzado. Email no enviado a ${to}`);
        throw error;
      }
      
      // Esperar un tiempo antes de reintentar (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
    }
  }
}

// Función para generar contenido con IA (Claude API)
async function generateContent() {
  console.log('Generando contenido con IA...');
  
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `Genera un newsletter semanal sobre desarrollo de software para la fecha actual.
              Incluye las siguientes secciones:
              1. Título creativo relacionado con desarrollo de software
              2. Introducción breve (un párrafo)
              3. "Tendencias de la semana": Incluye 3-4 tendencias actuales en desarrollo de software
              4. "Artículo principal": Un artículo breve (300-400 palabras) sobre una tecnología o práctica emergente
              5. "Consejos de código": 2-3 snippets útiles con explicación
              6. "Herramientas para conocer": 2-3 herramientas o recursos con enlaces y breve descripción
              7. Una reflexión final corta

              El formato debe ser en Markdown para facilitar la conversión a HTML.
              Asegúrate que sea actual, técnicamente preciso y útil para desarrolladores de todos los niveles.
              Debe estar completamente en español.`
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return response.data.content[0].text;
  } catch (error) {
    console.error('Error generando contenido:', error.message);
    if (error.response) {
      console.error('Detalles:', error.response.data);
    }
    return '## Error al generar contenido\n\nLo sentimos, ha ocurrido un error al generar el contenido de esta semana.';
  }
}

// Función para generar titulares de noticias tecnológicas actuales
async function fetchTechNews() {
  try {
    console.log('Obteniendo noticias tecnológicas...');
    // Puedes reemplazar esta API con la que prefieras
    const response = await axios.get(`https://newsapi.org/v2/top-headlines?category=technology&language=es&apiKey=${process.env.NEWS_API_KEY}`);
    
    let newsContent = '## Noticias de Tecnología\n\n';
    const articles = response.data.articles.slice(0, 3); // Solo las primeras 3 noticias
    
    articles.forEach(article => {
      newsContent += `### [${article.title}](${article.url})\n`;
      newsContent += `${article.description || 'Sin descripción disponible'}\n\n`;
    });
    
    return newsContent;
  } catch (error) {
    console.error('Error obteniendo noticias:', error.message);
    return '## Noticias de Tecnología\n\nNo hay noticias disponibles esta semana.';
  }
}

// Función para convertir Markdown a HTML
function convertToHtml(markdown) {
  return marked(markdown);
}

// Función para crear una plantilla de email HTML
function createEmailTemplate(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>v Pills - Píldoras de Conocimiento</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333333;
          max-width: 700px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #003A70; /* Azul Vector */
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 32px;
        }
        .header h1 span {
          color: #FFCC00; /* Acento dorado */
        }
        .content {
          padding: 20px;
          background-color: #FFFFFF;
          border: 1px solid #E0E0E0;
          border-top: none;
        }
        h2 {
          color: #003A70; /* Azul Vector */
          border-bottom: 2px solid #FFCC00;
          padding-bottom: 5px;
        }
        h3 {
          color: #E31937; /* Rojo Vector */
        }
        code {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 3px;
          font-family: monospace;
          padding: 2px 5px;
        }
        pre {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 3px;
          font-family: monospace;
          padding: 10px;
          overflow-x: auto;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 0.8em;
          color: #666666;
          background-color: #003A70;
          color: white;
          border-radius: 0 0 5px 5px;
        }
        a {
          color: #E31937; /* Rojo Vector */
          text-decoration: none;
          font-weight: bold;
        }
        .footer a {
          color: #FFCC00; /* Acento dorado para enlaces en footer */
        }
        .tip-box {
          background-color: #F0F7FF;
          border-left: 4px solid #003A70;
          padding: 15px;
          margin: 20px 0;
        }
        .news-item {
          padding: 15px;
          margin-bottom: 15px;
          background-color: #F5F5F5;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1><span>v</span> Pills</h1>
        <p>Píldoras de conocimiento para desarrolladores</p>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} v Pills - Vector Casa de Bolsa. Todos los derechos reservados.</p>
        <p>
          <a href="[unsubscribe_link]">Cancelar suscripción</a> | 
          <a href="[web_version]">Ver en navegador</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

// Obtener lista de suscriptores
function getSubscribers() {
  const data = fs.readFileSync(SUBSCRIBERS_FILE);
  return JSON.parse(data).subscribers;
}

// Enviar newsletter a todos los suscriptores
async function sendNewsletter() {
  console.log('Iniciando envío de newsletter...');
  
  try {
    // Generar contenido
    const mainContent = await generateContent();
    const newsContent = await fetchTechNews();
    const fullContent = newsContent + '\n\n' + mainContent;
    
    // Convertir a HTML
    const htmlContent = convertToHtml(fullContent);
    const emailHtml = createEmailTemplate(htmlContent);
    
    // Obtener suscriptores
    const subscribers = getSubscribers();
    
    if (subscribers.length === 0) {
      console.log('No hay suscriptores para enviar el newsletter.');
      return;
    }

    // Asegurar que existe el directorio para guardar los newsletters generados
    const GENERATED_DIR = path.join(__dirname, 'generated');
    if (!fs.existsSync(GENERATED_DIR)) {
      fs.mkdirSync(GENERATED_DIR);
    }
    
    // Guardar copia del newsletter
    const date = new Date().toISOString().split('T')[0];
    fs.writeFileSync(`generated/newsletter-${date}.html`, emailHtml);
    fs.writeFileSync(`generated/newsletter-${date}.md`, fullContent);
    
    // Enviar emails
    console.log(`Enviando newsletter a ${subscribers.length} suscriptores...`);
    
    // Información del email
    const subject = `📱💻 v Pills - Píldoras de Conocimiento - ${new Date().toLocaleDateString()}`;
    
    // Enviar a cada suscriptor con reintentos
    for (const email of subscribers) {
      try {
        await sendEmailWithRetry(email, subject, emailHtml);
        console.log(`Newsletter enviado a: ${email}`);
      } catch (error) {
        console.error(`Error final enviando a ${email}:`, error.message);
      }
    }
    
    console.log('Proceso de envío de newsletter completado.');
  } catch (error) {
    console.error('Error en el proceso de newsletter:', error);
  }
}

// API simple para gestionar suscripciones
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Página principal - formulario de suscripción
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Suscríbete a v Pills</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, sans-serif; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f5f5f5;
        }
        .form-container { 
          background-color: #fff; 
          border: 1px solid #ddd; 
          padding: 20px; 
          border-radius: 5px; 
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        input, button { 
          padding: 10px; 
          margin: 10px 0; 
          width: 100%; 
          box-sizing: border-box; 
        }
        button { 
          background-color: #003A70; 
          color: white; 
          border: none; 
          cursor: pointer; 
        }
        h1 { 
          color: #003A70; 
        }
        h1 span {
          color: #E31937;
        }
      </style>
    </head>
    <body>
      <h1><span>v</span> Pills</h1>
      <div class="form-container">
        <h2>Suscríbete para recibir píldoras semanales de conocimiento sobre desarrollo de software</h2>
        <form action="/subscribe" method="post">
          <input type="email" name="email" placeholder="Tu correo electrónico" required>
          <button type="submit">Suscribirme</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Endpoint para suscribirse
app.post('/subscribe', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).send('El correo electrónico es requerido');
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE));
    
    if (!data.subscribers.includes(email)) {
      data.subscribers.push(email);
      fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(data, null, 2));
      console.log(`Nuevo suscriptor: ${email}`);
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>¡Suscripción Exitosa!</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, sans-serif; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            text-align: center;
            background-color: #f5f5f5;
          }
          .success { 
            background-color: #fff; 
            border-left: 4px solid #00A651; 
            padding: 20px; 
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          h1 { 
            color: #003A70; 
          }
          h1 span {
            color: #E31937;
          }
        </style>
      </head>
      <body>
        <h1><span>v</span> Pills</h1>
        <div class="success">
          <h2>¡Gracias por suscribirte!</h2>
          <p>Tu correo ${email} ha sido registrado correctamente.</p>
          <p>Recibirás nuestras píldoras semanales con las últimas novedades sobre desarrollo de software.</p>
          <a href="/">Volver al inicio</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error al suscribir:', error);
    res.status(500).send('Error al procesar la suscripción');
  }
});

// Endpoint para cancelar suscripción
app.get('/unsubscribe', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cancelar Suscripción</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, sans-serif; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px;
          background-color: #f5f5f5;
        }
        .form-container { 
          background-color: #fff; 
          border: 1px solid #ddd; 
          padding: 20px; 
          border-radius: 5px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        input, button { 
          padding: 10px; 
          margin: 10px 0; 
          width: 100%; 
          box-sizing: border-box; 
        }
        button { 
          background-color: #E31937; 
          color: white; 
          border: none; 
          cursor: pointer; 
        }
        h1 { 
          color: #003A70; 
        }
        h1 span {
          color: #E31937;
        }
      </style>
    </head>
    <body>
      <h1><span>v</span> Pills</h1>
      <div class="form-container">
        <h2>¿Deseas dejar de recibir nuestras píldoras de conocimiento?</h2>
        <form action="/unsubscribe" method="post">
          <input type="email" name="email" placeholder="Tu correo electrónico" required>
          <button type="submit">Cancelar Suscripción</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/unsubscribe', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).send('El correo electrónico es requerido');
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE));
    
    if (data.subscribers.includes(email)) {
      data.subscribers = data.subscribers.filter(e => e !== email);
      fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(data, null, 2));
      console.log(`Suscriptor eliminado: ${email}`);
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Suscripción Cancelada</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, sans-serif; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            text-align: center;
            background-color: #f5f5f5;
          }
          .success { 
            background-color: #fff; 
            border-left: 4px solid #E31937; 
            padding: 20px; 
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          h1 { 
            color: #003A70; 
          }
          h1 span {
            color: #E31937;
          }
        </style>
      </head>
      <body>
        <h1><span>v</span> Pills</h1>
        <div class="success">
          <h2>Suscripción Cancelada</h2>
          <p>Tu correo ${email} ha sido eliminado de nuestra lista.</p>
          <p>Ya no recibirás más newsletters.</p>
          <p>Si cambias de opinión, puedes volver a suscribirte en cualquier momento.</p>
          <a href="/">Volver al inicio</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    res.status(500).send('Error al procesar la cancelación');
  }
});

// Endpoint para enviar el newsletter manualmente (protegido)
app.post('/send-newsletter', (req, res) => {
  const { adminKey } = req.body;
  
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).send('No autorizado');
  }
  
  // Enviar newsletter
  sendNewsletter()
    .then(() => {
      res.send('Newsletter enviado correctamente');
    })
    .catch((error) => {
      console.error('Error:', error);
      res.status(500).send('Error al enviar el newsletter');
    });
});

// Programar envío automático (todos los lunes a las 9:00 AM)
cron.schedule('0 9 * * 1', () => {
  console.log('Ejecutando envío programado del newsletter...');
  sendNewsletter();
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
  console.log('El newsletter se enviará automáticamente todos los lunes a las 9:00 AM');
});

// Para probar el envío inmediatamente al iniciar (opcional, comentar en producción)
// setTimeout(() => {
//   console.log('Ejecutando envío de prueba...');
//   sendNewsletter().then(() => {
//     console.log('Envío de prueba completado');
//   });
// }, 3000);

// Exportar funciones para uso en otros módulos si es necesario
module.exports = {
  generateContent,
  sendNewsletter
};
