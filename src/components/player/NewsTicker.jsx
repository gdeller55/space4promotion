import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Rss } from 'lucide-react';

const llmResponseSchema = {
  type: "object",
  properties: {
    articles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "The main headline of the article." },
          link: { type: "string", description: "The URL to the full article." }
        },
        required: ["title"]
      }
    }
  },
  required: ["articles"]
};

export default function NewsTicker({ feedUrl }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!feedUrl) return;

    const fetchNews = async () => {
      setLoading(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Fetch the content from the RSS feed at this URL: ${feedUrl}. Parse it and return the top 7 latest news headlines. Ignore any entries that are not news articles (like weather or travel updates).`,
          response_json_schema: llmResponseSchema,
        });

        if (result && result.articles) {
          setArticles(result.articles);
        } else {
          console.warn("News feed parsing returned no articles.");
          setArticles([]);
        }
      } catch (error) {
        console.error("Error fetching or parsing news feed:", error);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    // Fetch news every 15 minutes
    const interval = setInterval(fetchNews, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [feedUrl]);

  if (loading || articles.length === 0) {
    return null; // Don't render anything if there's no news or it's loading
  }

  const tickerText = articles.map(article => article.title).join(' ••• ');

  return (
    <div style={styles.tickerWrap}>
      <div style={styles.ticker}>
        <Rss size={20} style={styles.icon} />
        <span>{tickerText}</span>
        <Rss size={20} style={styles.icon} />
        <span style={{ paddingLeft: '20px' }}>{tickerText}</span>
      </div>
    </div>
  );
}

const styles = {
  tickerWrap: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '40px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    overflow: 'hidden',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    fontFamily: '"Inter", sans-serif',
    fontSize: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
  },
  ticker: {
    display: 'inline-block',
    whiteSpace: 'nowrap',
    animation: 'ticker 60s linear infinite',
    paddingLeft: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    margin: '0 15px',
    flexShrink: 0,
    color: '#06b6d4', // cyan-500
  },
};

// Add keyframes for ticker animation to the document head
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
  @keyframes ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
`;
document.head.appendChild(styleSheet);