// Import the necessary modules
import { fetch } from 'bun';
import * as cheerio from 'cheerio';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { URL } from 'url';
import { createInterface } from 'readline';

// Function to clean a string to be a valid filename
function cleanTitleForFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9]/g, '_'); // Replace non-alphanumeric characters with underscores
}

// Function to get the domain name from a URL
function getDomainName(url: string): string {
  const parsedUrl = new URL(url);
  return parsedUrl.hostname.replace('www.', '');
}

// Function to get a formatted date string
function getFormattedDate(): string {
  const date = new Date();
  return date.toISOString().split('T')[0]; // Returns date in YYYY-MM-DD format
}

// Function to scrape the website
async function scrapeWebsite(url: string) {
  try {
    // Fetch the content of the page
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    // Get the text content of the response
    const body = await response.text();

    // Load the HTML content into Cheerio
    const $ = cheerio.load(body);

    // Extract data using CSS selectors
    const title = $('h1').text();
    const paragraphs = $('p').map((i, el) => $(el).text()).get();

    // Clean the title to be used as a filename
    const filenameTitle = cleanTitleForFilename(title);

    // Get the formatted date
    const currentDate = getFormattedDate();

    // Prepare data for saving
    const markdownContent = `# ${title}\n\nDate: ${currentDate}\n\n${paragraphs.join('\n\n')}`;
    const textContent = `${title}\n\nDate: ${currentDate}\n\n${paragraphs.join('\n\n')}`;
    const jsonData = JSON.stringify({ title, date: currentDate, paragraphs }, null, 2);

    // Get the domain name and create a directory for it
    const domainName = getDomainName(url);
    const dataDir = join(__dirname, 'data', domainName);
    await mkdir(dataDir, { recursive: true });

    // Save the data in Markdown format
    await writeFile(join(dataDir, `${filenameTitle}_${currentDate}.md`), markdownContent);

    // Save the data in plain text format
    await writeFile(join(dataDir, `${filenameTitle}_${currentDate}.txt`), textContent);

    // Save the data in JSON format
    await writeFile(join(dataDir, `${filenameTitle}_${currentDate}.json`), jsonData);

    console.log(`Data has been saved for ${url} on ${currentDate} in the folder '${domainName}' with the title as the filename.`);
  } catch (error) {
    console.error(`Error scraping website at ${url}: ${error.message}`);
  }
}

// Function to start the interactive scraping process
async function startInteractiveScraping() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.setPrompt('Enter a URL to scrape (or type /exit to quit): ');
  rl.prompt();

  rl.on('line', async (line) => {
    if (line.toLowerCase() === '/exit') {
      console.log('Exiting...');
      rl.close();
    } else {
      await scrapeWebsite(line.trim());
      rl.prompt();
    }
  }).on('close', () => {
    process.exit(0);
  });
}

// Start the interactive scraping process
startInteractiveScraping();
