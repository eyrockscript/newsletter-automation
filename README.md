# v Pills - Newsletter Automation

Automation system for generating and sending weekly software development newsletters using AI.

## Table of Contents
- [Description](#description)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
  - [Start the server](#start-the-server)
  - [Web interface](#web-interface)
  - [Send newsletter manually](#send-newsletter-manually)
  - [Automatic scheduling](#automatic-scheduling)
- [File structure](#file-structure)
- [Customization](#customization)
- [API Credits and Domain Management](#api-credits-and-domain-management)
  - [API Credits Management](#api-credits-management)
  - [Domain Management in Resend](#domain-management-in-resend)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Contributing](#contributing)
- [Author](#author)

## Description

This project implements a complete system for the automatic generation and delivery of weekly software development newsletters. It uses Claude API (Anthropic) to generate relevant and current content, and the Resend platform to send the emails to a list of subscribers.

## Features

- **AI-generated content**: Uses Anthropic's Claude to create original and relevant content.
- **Dynamic sections**: Includes current trends, main articles, code tips, and tool recommendations.
- **Technology news**: Optional integration with NewsAPI to include current news.
- **Subscriber management**: Web API for users to subscribe and unsubscribe.
- **Automated delivery**: Automatic scheduling of weekly deliveries (Mondays at 9:00 AM).
- **Manual sending**: Protected endpoint to trigger manual sending when needed.
- **File storage**: Saves local copies of each newsletter for future reference.

## Prerequisites

- Node.js (version 14 or higher recommended)
- NPM or Yarn
- Anthropic account (for Claude API)
- Resend account (for email sending)
- NewsAPI account (optional, for technology news)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/eyrockscript/newsletter-automation.git
   cd newsletter-automation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root of the project with the following variables:
   ```
   ANTHROPIC_API_KEY=your_anthropic_key
   RESEND_API_KEY=your_resend_key
   FROM_EMAIL=onboarding@resend.dev
   ADMIN_KEY=your_admin_key_for_manual_sending
   NEWS_API_KEY=your_newsapi_key (optional)
   PORT=3000 (optional, default is 3000)
   ```

   > **IMPORTANT**: Never commit your `.env` file to version control. Add it to your `.gitignore` file.

4. Create directory for generated newsletters:
   ```bash
   mkdir generated
   ```

## Usage

### Start the server

```bash
npm start
```

The server will start running on `http://localhost:3000` (or the port specified in the environment variables).

### Web interface

- **Main page**: `http://localhost:3000/` - Subscription form
- **Unsubscribe**: `http://localhost:3000/unsubscribe` - Form to cancel subscription

### Send newsletter manually

You can send a newsletter manually by making a POST request to the `/send-newsletter` endpoint with an admin key:

```bash
curl -X POST http://localhost:3000/send-newsletter \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your_admin_key_here"}'
```

> **NOTE**: The admin key must match the `ADMIN_KEY` value in your `.env` file.

### Automatic scheduling

By default, the system is configured to send newsletters automatically every Monday at 9:00 AM. You can modify this schedule in the code by adjusting the cron expression:

```javascript
cron.schedule('0 9 * * 1', () => {
  console.log('Executing scheduled newsletter delivery...');
  sendNewsletter();
});
```

## File structure

- `newsletter-automation.js`: Main file with all the system logic
- `subscribers.json`: Stores the list of subscribers (created automatically)
- `generated/`: Directory where copies of newsletters are saved
  - `newsletter-YYYY-MM-DD.html`: HTML version of the newsletter
  - `newsletter-YYYY-MM-DD.md`: Markdown version of the newsletter

## Customization

### Email template

The HTML template for the email is in the `createEmailTemplate()` function. You can modify it to adjust the design, colors, and styles according to your needs.

### Generated content

You can customize the prompt sent to Claude for content generation in the `generateContent()` function. Modify the instructions to adjust the type of content you want.

> **TIP**: Experiment with different prompts to find the one that generates the best content for your audience.

### Scheduling

Adjust the cron expression in the `cron.schedule()` function to change the frequency and time of delivery. By default it's `0 9 * * 1` (Monday at 9:00 AM).

## API Credits and Domain Management

### API Credits Management

This project uses several external APIs that may require credits or have usage limits:

1. **Anthropic (Claude API)**
   - Sign up at [Anthropic's website](https://www.anthropic.com/)
   - Obtain an API key from your dashboard
   - Monitor your usage to ensure you don't exceed limits
   - Free tier typically has limited requests per month

2. **NewsAPI**
   - Register at [NewsAPI.org](https://newsapi.org/)
   - Choose a plan based on your needs (free tier available)
   - Monitor API usage through your dashboard
   - Be aware of rate limits (especially on free tier)

3. **Resend**
   - Create an account at [Resend.com](https://resend.com/)
   - Check pricing or credit limits for your account
   - Monitor email sending to stay within limits
   - Free tier typically allows limited emails per month

> **WARNING**: Exceeding API limits may result in additional charges or service suspension. Monitor your usage regularly!

### Domain Management in Resend

To use your own sending domain instead of the default `onboarding@resend.dev`:

1. **Add your domain in Resend**
   - Log in to your Resend dashboard
   - Navigate to the Domains section
   - Click "Add Domain" and follow the instructions

2. **Verify Domain Ownership**
   - Add the provided DNS records to your domain's DNS settings
   - This typically includes DKIM, SPF, and DMARC records
   - Wait for verification to complete (can take up to 24-48 hours)

3. **Configure Your Application**
   - Once verified, update your `.env` file with your domain email:
     ```
     FROM_EMAIL=newsletter@yourdomain.com
     ```

4. **Monitor Email Deliverability**
   - Check delivery statistics in your Resend dashboard
   - Pay attention to bounces, complaints and deliverability metrics

> **IMPORTANT**: Using `onboarding@resend.dev` is recommended for testing, but for production, a verified domain improves deliverability and professionalism.

## Troubleshooting

### Errors with node-fetch

If you encounter errors related to `Headers is not defined` or `fetch is not defined`, make sure you have installed `node-fetch` version 2:

```bash
npm install node-fetch@2
```

> **NOTE**: The project is configured to use node-fetch version 2, as version 3 requires a different import mechanism.

### Email sending errors

If you encounter errors when sending emails with Resend, verify:

1. That your Resend API key is valid
2. That the sender domain is verified (use `onboarding@resend.dev` for testing)
3. Check the detailed logs to identify the specific problem

> **TIP**: If you're having issues with Resend, try using the test mode first to validate your setup without actually sending emails.

## License

[MIT](LICENSE)

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a pull request.

## Author

[E Trejo](https://github.com/eyrockscript) - dev.eliud.trejo@gmail.com
