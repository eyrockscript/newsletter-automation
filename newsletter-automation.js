// newsletter-automation.js
// Complete system to generate and send a weekly development newsletter using AI

// Import dependencies
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { marked } = require('marked');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// APIs and services configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');

// Check if subscribers file exists, if not, create it
if (!fs.existsSync(SUBSCRIBERS_FILE)) {
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify({ subscribers: [] }));
}

// Function to generate content with AI (Claude API)
async function generateContent() {
  console.log('Generating content with AI...');
  
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `Generate a weekly software development newsletter for the current date.
              Include the following sections:
              1. Creative title related to software development
              2. Brief introduction (one paragraph)
              3. "Weekly Trends": Include 3-4 current trends in software development
              4. "Main Article": A short article (300-400 words) about an emerging technology or practice
              5. "Code Tips": 2-3 useful snippets with explanation
              6. "Tools to Discover": 2-3 tools or resources with links and brief description
              7. A short final reflection

              The format should be in Markdown to facilitate HTML conversion.
              Make sure it's current, technically accurate, and useful for developers of all levels.`
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
    console.error('Error generating content:', error.message);
    if (error.response) {
      console.error('Details:', error.response.data);
    }
    return '## Error generating content\n\nWe apologize, an error occurred while generating this week\'s content.';
  }
}

// Function to generate tech news headlines
async function fetchTechNews() {
  try {
    console.log('Fetching tech news...');
    // You can replace this API with one of your choice
    const response = await axios.get(`https://newsapi.org/v2/top-headlines?category=technology&language=en&apiKey=${process.env.NEWS_API_KEY}`);
    
    let newsContent = '## Technology News\n\n';
    const articles = response.data.articles.slice(0, 3); // Only the first 3 news
    
    articles.forEach(article => {
      newsContent += `### [${article.title}](${article.url})\n`;
      newsContent += `${article.description || 'No description available'}\n\n`;
    });
    
    return newsContent;
  } catch (error) {
    console.error('Error fetching news:', error.message);
    return '## Technology News\n\nNo news available this week.';
  }
}

// Function to convert Markdown to HTML
function convertToHtml(markdown) {
  return marked(markdown);
}

// Function to create an HTML email template
function createEmailTemplate(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Development Newsletter</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 700px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4285f4;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
        }
        h1, h2, h3 {
          color: #4285f4;
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
          color: #666;
        }
        a {
          color: #4285f4;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>💻 Weekly Development Newsletter</h1>
        <p>Latest trends, tools and tips for developers</p>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Development Newsletter. All rights reserved.</p>
        <p>
          <a href="[unsubscribe_link]">Unsubscribe</a> | 
          <a href="[web_version]">View in browser</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

// Configure email transport
function setupMailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail', // You can change to another service if you prefer
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD
    }
  });
}

// Get subscribers list
function getSubscribers() {
  const data = fs.readFileSync(SUBSCRIBERS_FILE);
  return JSON.parse(data).subscribers;
}

// Send newsletter to all subscribers
async function sendNewsletter() {
  console.log('Starting newsletter delivery...');
  
  try {
    // Generate content
    const mainContent = await generateContent();
    const newsContent = await fetchTechNews();
    const fullContent = newsContent + '\n\n' + mainContent;
    
    // Convert to HTML
    const htmlContent = convertToHtml(fullContent);
    const emailHtml = createEmailTemplate(htmlContent);
    
    // Configure email transporter
    const transporter = setupMailTransporter();
    
    // Get subscribers
    const subscribers = getSubscribers();
    
    if (subscribers.length === 0) {
      console.log('No subscribers to send the newsletter to.');
      return;
    }
    
    // Save a copy of the newsletter
    const date = new Date().toISOString().split('T')[0];
    fs.writeFileSync(`newsletter-${date}.html`, emailHtml);
    fs.writeFileSync(`newsletter-${date}.md`, fullContent);
    
    // Send emails
    console.log(`Sending newsletter to ${subscribers.length} subscribers...`);
    
    // Email information
    const mailOptions = {
      from: `"Development Newsletter" <${EMAIL_USER}>`,
      subject: `📱💻 Development Newsletter - ${new Date().toLocaleDateString()}`,
      html: emailHtml
    };
    
    // Send to each subscriber
    for (const email of subscribers) {
      try {
        mailOptions.to = email;
        await transporter.sendMail(mailOptions);
        console.log(`Newsletter sent to: ${email}`);
      } catch (error) {
        console.error(`Error sending to ${email}:`, error.message);
      }
    }
    
    console.log('Newsletter delivery process completed.');
  } catch (error) {
    console.error('Error in newsletter process:', error);
  }
}

// Simple API to manage subscriptions
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Main page - subscription form
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Subscribe to our Development Newsletter</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .form-container { background-color: #f9f9f9; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
        input, button { padding: 10px; margin: 10px 0; width: 100%; box-sizing: border-box; }
        button { background-color: #4285f4; color: white; border: none; cursor: pointer; }
        h1 { color: #4285f4; }
      </style>
    </head>
    <body>
      <h1>Development Newsletter</h1>
      <div class="form-container">
        <h2>Subscribe to receive weekly news about software development</h2>
        <form action="/subscribe" method="post">
          <input type="email" name="email" placeholder="Your email address" required>
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Endpoint to subscribe
app.post('/subscribe', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).send('Email is required');
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE));
    
    if (!data.subscribers.includes(email)) {
      data.subscribers.push(email);
      fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(data, null, 2));
      console.log(`New subscriber: ${email}`);
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Subscription Successful!</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
          .success { background-color: #d6f5d6; border: 1px solid #a3e0a3; padding: 20px; border-radius: 5px; }
          h1 { color: #4285f4; }
        </style>
      </head>
      <body>
        <h1>Development Newsletter</h1>
        <div class="success">
          <h2>Thank you for subscribing!</h2>
          <p>Your email ${email} has been registered successfully.</p>
          <p>You'll receive our weekly newsletter with the latest news on software development.</p>
          <a href="/">Back to home</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).send('Error processing subscription');
  }
});

// Endpoint to unsubscribe
app.get('/unsubscribe', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cancel Subscription</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .form-container { background-color: #f9f9f9; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
        input, button { padding: 10px; margin: 10px 0; width: 100%; box-sizing: border-box; }
        button { background-color: #f44336; color: white; border: none; cursor: pointer; }
        h1 { color: #4285f4; }
      </style>
    </head>
    <body>
      <h1>Cancel Subscription</h1>
      <div class="form-container">
        <h2>Do you want to stop receiving our newsletter?</h2>
        <form action="/unsubscribe" method="post">
          <input type="email" name="email" placeholder="Your email address" required>
          <button type="submit">Unsubscribe</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/unsubscribe', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).send('Email is required');
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE));
    
    if (data.subscribers.includes(email)) {
      data.subscribers = data.subscribers.filter(e => e !== email);
      fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(data, null, 2));
      console.log(`Subscriber removed: ${email}`);
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Subscription Cancelled</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
          .success { background-color: #ffe6e6; border: 1px solid #ffb3b3; padding: 20px; border-radius: 5px; }
          h1 { color: #4285f4; }
        </style>
      </head>
      <body>
        <h1>Development Newsletter</h1>
        <div class="success">
          <h2>Subscription Cancelled</h2>
          <p>Your email ${email} has been removed from our list.</p>
          <p>You will no longer receive newsletters.</p>
          <p>If you change your mind, you can subscribe again at any time.</p>
          <a href="/">Back to home</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).send('Error processing cancellation');
  }
});

// Endpoint to send newsletter manually (protected)
app.post('/send-newsletter', (req, res) => {
  const { adminKey } = req.body;
  
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).send('Unauthorized');
  }
  
  // Send newsletter
  sendNewsletter()
    .then(() => {
      res.send('Newsletter sent successfully');
    })
    .catch((error) => {
      console.error('Error:', error);
      res.status(500).send('Error sending newsletter');
    });
});

// Schedule automatic delivery (every Monday at 9:00 AM)
cron.schedule('0 9 * * 1', () => {
  console.log('Executing scheduled newsletter delivery...');
  sendNewsletter();
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
  console.log('Newsletter will be sent automatically every Monday at 9:00 AM');
});

// Export functions for use in other modules if needed
module.exports = {
  generateContent,
  sendNewsletter
};
