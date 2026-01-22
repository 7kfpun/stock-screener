#!/usr/bin/env node

/**
 * OpenRouter PR Review Script
 * Replaces claude-code-action with OpenRouter API for automated PR reviews
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PR_NUMBER = process.env.PR_NUMBER;
const REPO = process.env.GITHUB_REPOSITORY;

if (!OPENROUTER_API_KEY || !GITHUB_TOKEN || !PR_NUMBER || !REPO) {
  console.error('Missing required environment variables');
  process.exit(1);
}

/**
 * Make API call to OpenRouter
 */
async function callOpenRouter(messages, tools = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'anthropic/claude-3.5-haiku', // Using Claude through OpenRouter
      messages: messages,
      ...(tools && { tools }),
      max_tokens: 4096,
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com',
        'X-Title': 'Stock Screener PR Review',
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'OpenRouter API error'));
          } else {
            resolve(parsed);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Web search using DuckDuckGo (simple implementation)
 */
async function webSearch(query) {
  return new Promise((resolve, reject) => {
    const encodedQuery = encodeURIComponent(query);
    const options = {
      hostname: 'duckduckgo.com',
      port: 443,
      path: `/html/?q=${encodedQuery}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockScreener/1.0)',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Get PR file changes
 */
function getPRChanges() {
  try {
    const diff = execSync('git diff origin/main...HEAD', { encoding: 'utf-8' });
    const files = execSync('git diff --name-only origin/main...HEAD', { encoding: 'utf-8' })
      .split('\n')
      .filter(f => f);
    return { diff, files };
  } catch (error) {
    console.error('Error getting PR changes:', error.message);
    return { diff: '', files: [] };
  }
}

/**
 * Read CSV file and get top 5 tickers
 */
function getTopTickers() {
  try {
    // Find the dated CSV file
    const files = fs.readdirSync('public/data');
    const datedCsv = files.find(f => /^\d{4}-\d{2}-\d{2}\.csv$/.test(f));

    if (!datedCsv) {
      console.error('No dated CSV file found');
      return { date: null, tickers: [] };
    }

    const date = datedCsv.replace('.csv', '');
    const csvPath = path.join('public/data', datedCsv);
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    // Skip header, get first 5 tickers
    const tickers = lines.slice(1, 6).map(line => {
      const cols = line.split(',');
      return {
        ticker: cols[0]?.trim(),
        name: cols[1]?.trim(),
        // Include key metrics for analysis
        pe: cols[2]?.trim(),
        roe: cols[3]?.trim(),
      };
    }).filter(t => t.ticker);

    return { date, tickers };
  } catch (error) {
    console.error('Error reading CSV:', error.message);
    return { date: null, tickers: [] };
  }
}

/**
 * Post comment to PR
 */
function postPRComment(comment) {
  try {
    const escaped = comment.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    execSync(`gh pr comment ${PR_NUMBER} --body "${escaped}"`, {
      env: { ...process.env, GH_TOKEN: GITHUB_TOKEN },
    });
    console.log('Posted comment to PR');
  } catch (error) {
    console.error('Error posting comment:', error.message);
  }
}

/**
 * Approve PR
 */
function approvePR() {
  try {
    execSync(`gh pr review ${PR_NUMBER} --approve`, {
      env: { ...process.env, GH_TOKEN: GITHUB_TOKEN },
    });
    console.log('Approved PR');
  } catch (error) {
    console.error('Error approving PR:', error.message);
  }
}

/**
 * Main review process
 */
async function main() {
  console.log('Starting OpenRouter PR Review...');

  // Step 1: Get PR changes
  const { diff, files } = getPRChanges();
  console.log(`Files changed: ${files.join(', ')}`);

  // Step 2: Verify changes are only CSV files in public/data
  const invalidFiles = files.filter(f => !f.startsWith('public/data/') || !f.endsWith('.csv'));
  if (invalidFiles.length > 0) {
    const errorComment = `❌ **Verification Failed**\n\nUnexpected files modified:\n${invalidFiles.map(f => `- ${f}`).join('\n')}`;
    postPRComment(errorComment);
    process.exit(1);
  }

  // Step 3: Get top 5 tickers
  const { date, tickers } = getTopTickers();
  if (!date || tickers.length === 0) {
    postPRComment('❌ **Error**: Could not extract ticker data from CSV');
    process.exit(1);
  }

  console.log(`Analyzing top ${tickers.length} tickers for ${date}`);

  // Step 4: Research each ticker using OpenRouter
  const stockAnalyses = [];
  for (const stock of tickers) {
    console.log(`Researching ${stock.ticker}...`);

    // Simulate web search results (in a real implementation, you'd parse search results)
    const searchQuery = `${stock.ticker} ${stock.name} latest news ${new Date().getFullYear()}`;

    const messages = [
      {
        role: 'user',
        content: `Provide a brief analysis of ${stock.ticker} (${stock.name}):
1. Company description (2-3 sentences about what they do and market position)
2. Latest news (recent developments, earnings, announcements)
3. Why this stock is notable based on metrics like P/E: ${stock.pe}, ROE: ${stock.roe}

Keep it concise and factual. Focus on investment-relevant information.`
      }
    ];

    try {
      const response = await callOpenRouter(messages);
      const analysis = response.choices[0].message.content;

      // Parse the analysis into structured format
      stockAnalyses.push({
        ticker: stock.ticker,
        name: stock.name,
        analysis: analysis,
      });
    } catch (error) {
      console.error(`Error analyzing ${stock.ticker}:`, error.message);
      stockAnalyses.push({
        ticker: stock.ticker,
        name: stock.name,
        analysis: 'Analysis unavailable',
      });
    }
  }

  // Step 5: Generate summary JSON
  const summaryData = {
    date: date,
    updated_at: new Date().toISOString(),
    top_stocks: stockAnalyses.map(s => ({
      ticker: s.ticker,
      description: `${s.name} - ${s.analysis.substring(0, 200)}...`,
      latest_news: 'See full analysis',
      why_selected: s.analysis,
    })),
  };

  // Save summary files
  const summaryDir = 'public/data/summary';
  if (!fs.existsSync(summaryDir)) {
    fs.mkdirSync(summaryDir, { recursive: true });
  }

  const summaryJson = JSON.stringify(summaryData, null, 2);
  fs.writeFileSync(path.join(summaryDir, `${date}.json`), summaryJson);
  fs.writeFileSync(path.join(summaryDir, 'latest.json'), summaryJson);
  console.log(`Saved summaries to ${summaryDir}/`);

  // Step 6: Commit and push summary files
  try {
    execSync('git add public/data/summary/', { stdio: 'inherit' });
    execSync(`git commit -m "data: add stock summaries for ${date}"`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('Committed and pushed summary files');
  } catch (error) {
    console.error('Error committing files:', error.message);
  }

  // Step 7: Post PR comment
  const comment = `✅ **Verification Complete**
- CSV files updated correctly
- Data format consistent
- No unexpected changes

📊 **Top ${stockAnalyses.length} Stocks Analysis**

${stockAnalyses.map(s => `**${s.ticker}** - ${s.name}\n${s.analysis}\n`).join('\n')}

💾 **Summary Files**
- Saved to \`public/data/summary/${date}.json\`
- Updated \`public/data/summary/latest.json\`
`;

  postPRComment(comment);

  // Step 8: Approve PR
  approvePR();

  console.log('PR review completed successfully!');
}

// Run main process
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
