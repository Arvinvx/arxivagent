import { XMLParser } from "fast-xml-parser";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, headers, attempts = 3) {
  let lastResponse;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, { headers });
    lastResponse = response;

    if (response.status !== 429 && response.status !== 503) {
      return response;
    }

    if (attempt < attempts) {
      const retryAfter = response.headers?.get?.("retry-after");
      const retryAfterMs = retryAfter && !Number.isNaN(Number(retryAfter))
        ? Number(retryAfter) * 1000
        : 0;
      const backoffMs = Math.max(retryAfterMs, 1500 * attempt);
      await sleep(backoffMs);
    }
  }

  return lastResponse;
}

export async function fetchArxivPaper(query, isId = false) {
  const baseUrl = "https://export.arxiv.org/api/query";
  const url = isId
    ? `${baseUrl}?id_list=${encodeURIComponent(query)}`
    : `${baseUrl}?search_query=all:${encodeURIComponent(query)}&start=0&max_results=1`;

  const headers = {
    "User-Agent": "Cliconnect/1.0 (research-paper-fetcher)",
    Accept: "application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8"
  };

  const res = await fetchWithRetry(url, headers);

  const xmlText = await res.text();

  if (!res.ok) {
    throw new Error(`arXiv request failed with status ${res.status}`);
  }

  const parser = new XMLParser();
  const data = parser.parse(xmlText);

  const feed = data?.feed;
  if (!feed) {
    throw new Error('arXiv returned an unexpected response. Try a more specific paper title.');
  }

  const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];
  if (entries.length === 0) {
    throw new Error(`No arXiv papers found for "${query}". Try a more specific paper title.`);
  }

  const entry = entries[0];

  const authors = entry.author
    ? (Array.isArray(entry.author)
        ? entry.author.map((author) => author.name).filter(Boolean)
        : [entry.author.name].filter(Boolean))
    : [];

  const links = entry.link ? (Array.isArray(entry.link) ? entry.link : [entry.link]) : [];
  const pdfLink = links.find((link) => link["@_type"] === "application/pdf")?.["@_href"];

  return {
    title: entry.title?.trim?.() || 'Untitled',
    authors,
    abstract: entry.summary?.trim?.() || '',
    arxivId: entry.id?.split("/abs/").pop() || '',
    pdfLink,
    published: entry.published || ''
  };
}

