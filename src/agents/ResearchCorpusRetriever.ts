import { IngestedDocumentWithEmbedding } from '../services/ingestion.service.ts';
import { OllamaService } from '../services/ollama.service.ts';

export class ResearchCorpusRetriever {
  private documents: IngestedDocumentWithEmbedding[] = [];

  constructor(private ollama: OllamaService) {}

  // Called whenever new documents are ingested (via UI or Discovery Agent)
  addDocuments(docs: IngestedDocumentWithEmbedding[]) {
    for (const doc of docs) {
      if (!this.documents.some(d => d.metadata.id === doc.metadata.id)) {
        this.documents.push(doc);
      }
    }
  }

  // Semantic search using embeddings
  async semanticSearch(query: string, topK: number = 3): Promise<IngestedDocumentWithEmbedding[]> {
    if (this.documents.length === 0) return [];

    let queryEmbed: any;
    try {
      // Generate embedding for the query
      queryEmbed = await this.ollama.embeddings({
        model: 'nomic-embed-text',
        input: query,
      });
    } catch (e) {
      console.warn('Ollama query embedding failed, falling back to keyword search:', e);
      return [];
    }

    const embedArr = queryEmbed && queryEmbed.embedding 
      ? queryEmbed.embedding 
      : (Array.isArray(queryEmbed?.embeddings) ? queryEmbed.embeddings[0] : null);

    if (!embedArr) return [];

    // Compute cosine similarity
    const scored = this.documents
      .filter(doc => doc.embedding)
      .map(doc => ({
        doc,
        score: this.cosineSimilarity(embedArr, doc.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => item.doc);

    return scored;
  }

  // Keyword/title/text search (fallback)
  keywordSearch(query: string): IngestedDocumentWithEmbedding[] {
    const lower = query.toLowerCase();
    return this.documents.filter(doc =>
      doc.metadata.title.toLowerCase().includes(lower) ||
      doc.text.toLowerCase().includes(lower) ||
      doc.indexedTopics.some(t => t.toLowerCase().includes(lower)) ||
      doc.citations.some(c => c.toLowerCase().includes(lower))
    );
  }

  // Combine both: try semantic first, fallback to keyword
  async retrieve(query: string): Promise<IngestedDocumentWithEmbedding[]> {
    const semantic = await this.semanticSearch(query);
    if (semantic.length > 0) return semantic;
    return this.keywordSearch(query).slice(0, 3);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }
}
