import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaperGenerator } from '../paper-generator.js';
import { MAX_DRAFTS, MAX_DRAFT_AGE_MS } from '../types.js';

// Mock the unified search to avoid real HTTP calls
vi.mock('../data-sources.js', () => ({
  unifiedSearch: vi.fn(async () => []),
  convertPubMedToResearchPaper: vi.fn((a) => ({
    title: a.title || '',
    authors: a.authors || [],
    year: a.year || 2024,
    journal: a.journal || '',
    doi: a.doi || '',
    abstract: a.abstract || '',
    topicTags: a.meshTerms || [],
    source: `pubmed:${a.pmid || '0'}`,
  })),
  convertOpenAlexToResearchPaper: vi.fn((p) => ({
    title: p.title || '',
    authors: p.authors || [],
    year: p.year || 2024,
    journal: p.journal || '',
    doi: p.doi || '',
    abstract: p.abstract || '',
    topicTags: p.topics || [],
    source: `openalex:${p.id || '0'}`,
  })),
  convertSemanticScholarToResearchPaper: vi.fn((p) => ({
    title: p.title || '',
    authors: p.authors || [],
    year: p.year || 2024,
    journal: p.journal || '',
    abstract: p.abstract || '',
    topicTags: p.fieldsOfStudy || [],
    source: `semantic-scholar:${p.id || '0'}`,
  })),
}));

// Mock the mesh to avoid RPC calls
vi.mock('../service-mesh.js', () => ({
  mesh: {
    rpc: vi.fn(async () => ({ error: 'mocked' })),
    logProvenance: vi.fn(),
    fireEvent: vi.fn(),
  },
}));

describe('PaperGenerator', () => {
  let gen: PaperGenerator;

  beforeEach(() => {
    gen = new PaperGenerator();
  });

  describe('createDraft', () => {
    it('should create a draft with a valid draftId', async () => {
      const { draftId, draft } = await gen.createDraft({ topic: 'cannabinoid research' });
      expect(draftId).toBeTruthy();
      expect(typeof draftId).toBe('string');
      expect(draft.topic).toBe('cannabinoid research');
    });

    it('should throw on empty topic', async () => {
      await expect(gen.createDraft({ topic: '' })).rejects.toThrow('topic is required');
    });

    it('should store the draft and be retrievable', async () => {
      const { draftId, draft } = await gen.createDraft({ topic: 'terpene analysis' });
      const retrieved = gen.getDraft(draftId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.topic).toBe('terpene analysis');
    });

    it('should include strainName in draft if provided', async () => {
      const { draft } = await gen.createDraft({ topic: 'test', strainName: 'Blue Dream' });
      expect(draft.strainName).toBe('Blue Dream');
    });

    it('should track draft count', async () => {
      expect(gen.getDraftCount()).toBe(0);
      await gen.createDraft({ topic: 'a' });
      expect(gen.getDraftCount()).toBe(1);
      await gen.createDraft({ topic: 'b' });
      expect(gen.getDraftCount()).toBe(2);
    });
  });

  describe('generatePaper', () => {
    it('should generate a paper from a valid draft', async () => {
      const { draftId } = await gen.createDraft({ topic: 'cannabinoid research' });
      const paper = gen.generatePaper(draftId);

      expect(paper.id).toBeTruthy();
      expect(paper.title).toContain('cannabinoid research');
      expect(paper.abstract).toBeTruthy();
      expect(paper.sections.length).toBe(6);
      expect(paper.sections.map(s => s.title)).toEqual([
        '1. Introduction',
        '2. Literature Review',
        '3. Methods',
        '4. Results',
        '5. Discussion',
        '6. Conclusion',
      ]);
      expect(paper.references).toBeInstanceOf(Array);
      expect(paper.metadata.generatedAt).toBeGreaterThan(0);
      expect(paper.metadata.methodology).toBeTruthy();
    });

    it('should throw for non-existent draft', () => {
      expect(() => gen.generatePaper('fake-id')).toThrow('Draft not found');
    });

    it('should include strain name in title when provided', async () => {
      const { draftId } = await gen.createDraft({ topic: 'test', strainName: 'OG Kush' });
      const paper = gen.generatePaper(draftId);
      expect(paper.title).toContain('OG Kush');
    });

    it('should extract keywords from topic and strain', async () => {
      const { draftId } = await gen.createDraft({ topic: 'cannabinoid therapy', strainName: 'Charlotte Web' });
      const paper = gen.generatePaper(draftId);
      expect(paper.metadata.keywords).toContain('cannabinoid');
      // strainName is added as a single lowercase string
      expect(paper.metadata.keywords).toContain('charlotte web');
      expect(paper.metadata.keywords).toContain('therapy');
    });

    it('should have unique references', async () => {
      const { draftId } = await gen.createDraft({ topic: 'test' });
      const paper = gen.generatePaper(draftId);
      const uniqueRefs = [...new Set(paper.references)];
      expect(paper.references.length).toBe(uniqueRefs.length);
    });
  });

  describe('toLatex', () => {
    it('should produce valid LaTeX with document structure', async () => {
      const { draftId } = await gen.createDraft({ topic: 'test' });
      const paper = gen.generatePaper(draftId);
      const latex = gen.toLatex(paper);

      expect(latex).toContain('\\documentclass[12pt]{article}');
      expect(latex).toContain('\\begin{document}');
      expect(latex).toContain('\\end{document}');
      expect(latex).toContain('\\maketitle');
      expect(latex).toContain('\\begin{abstract}');
      expect(latex).toContain('\\end{abstract}');
      expect(latex).toContain('\\section{');
    });

    it('should escape LaTeX special characters', async () => {
      const { draftId } = await gen.createDraft({ topic: 'test with $pecial #chars' });
      const paper = gen.generatePaper(draftId);
      const latex = gen.toLatex(paper);

      // escapeLatex produces \$ and \# in the output string
      expect(latex).toContain('\\$');
      expect(latex).toContain('\\#');
    });
  });

  describe('toMarkdown', () => {
    it('should produce valid markdown', async () => {
      const { draftId } = await gen.createDraft({ topic: 'test' });
      const paper = gen.generatePaper(draftId);
      const md = gen.toMarkdown(paper);

      expect(md).toContain(`# ${paper.title}`);
      expect(md).toContain('## Abstract');
      expect(md).toContain('## 1. Introduction');
      expect(md).toContain('---');
    });
  });

  describe('deleteDraft', () => {
    it('should delete an existing draft', async () => {
      const { draftId } = await gen.createDraft({ topic: 'test' });
      expect(gen.getDraftCount()).toBe(1);
      const deleted = gen.deleteDraft(draftId);
      expect(deleted).toBe(true);
      expect(gen.getDraftCount()).toBe(0);
      expect(gen.getDraft(draftId)).toBeUndefined();
    });

    it('should return false for non-existent draft', () => {
      expect(gen.deleteDraft('nonexistent')).toBe(false);
    });
  });

  describe('Draft Eviction', () => {
    it('should evict stale drafts when creating new ones', async () => {
      const { draftId } = await gen.createDraft({ topic: 'old draft' });

      // Manually age the draft by setting createdAt in the past
      // Access private drafts map via any cast
      const drafts = (gen as any).drafts as Map<string, any>;
      const entry = drafts.get(draftId);
      if (entry) {
        entry.createdAt = Date.now() - MAX_DRAFT_AGE_MS - 1000;
      }

      await gen.createDraft({ topic: 'new draft' });

      // Old draft should be evicted
      expect(gen.getDraft(draftId)).toBeUndefined();
      expect(gen.getDraftCount()).toBe(1);
    });

    it('should evict oldest draft when max drafts exceeded', async () => {
      // Create MAX_DRAFTS drafts
      const ids: string[] = [];
      for (let i = 0; i < MAX_DRAFTS; i++) {
        const { draftId } = await gen.createDraft({ topic: `draft-${i}` });
        ids.push(draftId);
      }
      expect(gen.getDraftCount()).toBe(MAX_DRAFTS);

      // Create one more — should evict oldest
      await gen.createDraft({ topic: 'overflow' });
      expect(gen.getDraftCount()).toBe(MAX_DRAFTS);

      // First draft should be gone
      expect(gen.getDraft(ids[0])).toBeUndefined();
      // Last draft should exist
      expect(gen.getDraft(ids[ids.length - 1])).toBeDefined();
    });
  });

  describe('Methodology Detection', () => {
    it('should return computational by default', async () => {
      const { draftId } = await gen.createDraft({ topic: 'test' });
      const paper = gen.generatePaper(draftId);
      expect(paper.metadata.methodology).toBe('computational');
    });
  });

  describe('Results Section Content', () => {
    it('should not include strain profile when no strain data from search', async () => {
      const { draftId } = await gen.createDraft({ topic: 'test', strainName: 'Blue Dream' });
      const paper = gen.generatePaper(draftId);
      const resultsSection = paper.sections.find(s => s.title.includes('Results'));
      // Mock returns no strain data, so strain profile section should not appear
      expect(resultsSection!.content).not.toContain('Strain Profile Analysis');
    });

    it('should include literature synthesis count in results', async () => {
      const { draftId } = await gen.createDraft({ topic: 'test' });
      const paper = gen.generatePaper(draftId);
      const resultsSection = paper.sections.find(s => s.title.includes('Results'));
      expect(resultsSection!.content).toContain('Literature Synthesis');
    });
  });
});
