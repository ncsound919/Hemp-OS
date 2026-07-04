"""
Hemp OS Python Scientific Microservice

Replaces custom TypeScript implementations with mature open-source tools:
  - Biopython: PubMed searches, genome access, sequence analysis
  - SciPy: Statistical tests (t-test, ANOVA, correlation, distributions)
  - RDKit: Molecular descriptors, fingerprints, Tanimoto similarity
  - StatsModels: Time-series, regression, GLM

Run: uvicorn main:host --port 8000 --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Hemp OS Scientific Microservice")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# =========================================================================
# 1. Biopython - PubMed Search (replaces regex-XML parsing in data-sources.ts)
# =========================================================================

class PubMedSearchRequest(BaseModel):
    query: str
    max_results: int = 20

class PubMedArticle(BaseModel):
    pmid: str
    title: str
    authors: List[str]
    journal: str
    year: int
    abstract: str
    doi: Optional[str] = None

@app.post("/pubmed/search", response_model=List[PubMedArticle])
async def search_pubmed(req: PubMedSearchRequest):
    """Search PubMed using Biopython Entrez (replaces regex-XML in data-sources.ts)"""
    try:
        from Bio import Entrez
        Entrez.email = "hemp-os@research.local"
        Entrez.tool = "HempOS"

        # Search
        handle = Entrez.esearch(db="pubmed", term=req.query, retmax=req.max_results, sort="relevance")
        record = Entrez.read(handle)
        handle.close()
        ids = record["IdList"]

        if not ids:
            return []

        # Fetch details
        handle = Entrez.efetch(db="pubmed", id=",".join(ids), retmode="xml")
        records = Entrez.read(handle)
        handle.close()

        articles = []
        for article in records["PubmedArticle"]:
            medline = article["MedlineCitation"]
            art = medline["Article"]
            article_ids = article.get("PubmedData", {}).get("ArticleIdList", [])
            doi = ""
            for aid in article_ids:
                if aid.attributes.get("IdType") == "doi":
                    doi = str(aid)

            authors = []
            for author in art.get("AuthorList", []):
                if "LastName" in author:
                    authors.append(f"{author['LastName']} {author.get('Initials', '')}")

            abstract_parts = art.get("Abstract", {}).get("AbstractText", [])
            abstract = " ".join(str(p) for p in abstract_parts)

            articles.append(PubMedArticle(
                pmid=str(medline["PMID"]),
                title=str(art.get("ArticleTitle", "")),
                authors=authors,
                journal=str(art.get("Journal", {}).get("Title", "")),
                year=int(art.get("Journal", {}).get("JournalIssue", {}).get("PubDate", {}).get("Year", 0) or 0),
                abstract=abstract,
                doi=doi,
            ))

        return articles

    except ImportError:
        raise HTTPException(503, "Biopython not installed. Run: pip install biopython")
    except Exception as e:
        raise HTTPException(500, f"PubMed search failed: {str(e)}")


# =========================================================================
# 2. RDKit - Molecular Descriptors (replaces PubChem API calls for local computation)
# =========================================================================

class MoleculeRequest(BaseModel):
    smiles: str

class MoleculeDescriptors(BaseModel):
    smiles: str
    molecular_weight: float
    logp: float
    tpsa: float
    h_bond_donors: int
    h_bond_acceptors: int
    rotatable_bonds: int
    heavy_atom_count: int
    ring_count: int

@app.post("/chem/descriptors", response_model=MoleculeDescriptors)
async def compute_descriptors(req: MoleculeRequest):
    """Compute molecular descriptors using RDKit"""
    try:
        from rdkit import Chem
        from rdkit.Chem import Descriptors, Lipinski

        mol = Chem.MolFromSmiles(req.smiles)
        if mol is None:
            raise HTTPException(400, f"Invalid SMILES: {req.smiles}")

        return MoleculeDescriptors(
            smiles=req.smiles,
            molecular_weight=Descriptors.MolWt(mol),
            logp=Descriptors.MolLogP(mol),
            tpsa=Descriptors.TPSA(mol),
            h_bond_donors=Lipinski.NumHDonors(mol),
            h_bond_acceptors=Lipinski.NumHAcceptors(mol),
            rotatable_bonds=Lipinski.NumRotatableBonds(mol),
            heavy_atom_count=mol.GetNumHeavyAtoms(),
            ring_count=Descriptors.RingCount(mol),
        )
    except ImportError:
        raise HTTPException(503, "RDKit not installed. Run: pip install rdkit")


class SimilarityRequest(BaseModel):
    smiles_a: str
    smiles_b: str

@app.post("/chem/tanimoto")
async def compute_tanimoto(req: SimilarityRequest):
    """Compute Tanimoto similarity between two molecules using Morgan fingerprints"""
    try:
        from rdkit import Chem, DataStructs
        from rdkit.Chem import AllChem

        mol_a = Chem.MolFromSmiles(req.smiles_a)
        mol_b = Chem.MolFromSmiles(req.smiles_b)
        if mol_a is None or mol_b is None:
            raise HTTPException(400, "Invalid SMILES")

        fp_a = AllChem.GetMorganFingerprintAsBitVect(mol_a, 2, 2048)
        fp_b = AllChem.GetMorganFingerprintAsBitVect(mol_b, 2, 2048)
        tanimoto = DataStructs.TanimotoSimilarity(fp_a, fp_b)

        return {"tanimoto": tanimoto, "smiles_a": req.smiles_a, "smiles_b": req.smiles_b}
    except ImportError:
        raise HTTPException(503, "RDKit not installed")


# =========================================================================
# 3. SciPy - Statistical Tests (replaces jstat for advanced analysis)
# =========================================================================

class TTestRequest(BaseModel):
    group1: List[float]
    group2: List[float]

@app.post("/stats/ttest")
async def welch_ttest(req: TTestRequest):
    """Welch's t-test with effect size"""
    from scipy import stats as sp_stats
    import numpy as np

    g1, g2 = np.array(req.group1), np.array(req.group2)
    t_stat, p_value = sp_stats.ttest_ind(g1, g2, equal_var=False)

    # Cohen's d
    n1, n2 = len(g1), len(g2)
    pooled_std = np.sqrt(((n1 - 1) * np.var(g1, ddof=1) + (n2 - 1) * np.var(g2, ddof=1)) / (n1 + n2 - 2))
    cohens_d = (np.mean(g1) - np.mean(g2)) / pooled_std if pooled_std > 0 else 0

    return {
        "t_statistic": float(t_stat),
        "p_value": float(p_value),
        "cohens_d": float(abs(cohens_d)),
        "mean1": float(np.mean(g1)),
        "mean2": float(np.mean(g2)),
        "n1": n1,
        "n2": n2,
        "significant": bool(p_value < 0.05),
    }


class CorrelationRequest(BaseModel):
    x: List[float]
    y: List[float]

@app.post("/stats/correlation")
async def pearson_correlation(req: CorrelationRequest):
    """Pearson correlation with confidence interval"""
    from scipy import stats as sp_stats
    import numpy as np

    r, p_value = sp_stats.pearsonr(req.x, req.y)
    n = len(req.x)

    # Fisher Z confidence interval
    z = np.arctanh(r)
    se = 1 / np.sqrt(n - 3)
    ci_low = np.tanh(z - 1.96 * se)
    ci_high = np.tanh(z + 1.96 * se)

    return {
        "r": float(r),
        "p_value": float(p_value),
        "confidence_interval": [float(ci_low), float(ci_high)],
        "n": n,
        "significant": bool(p_value < 0.05),
    }


# =========================================================================
# 4. Health Check
# =========================================================================

@app.get("/health")
async def health():
    """Check which scientific libraries are available"""
    status = {}
    for module_name in ["Bio", "rdkit", "scipy", "statsmodels"]:
        try:
            __import__(module_name)
            status[module_name] = "available"
        except ImportError:
            status[module_name] = "not installed"
    return {"status": "ok", "modules": status}
