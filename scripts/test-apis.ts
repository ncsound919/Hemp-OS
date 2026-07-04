async function main() {
  console.log('=== Testing APIs ===\n');

  // 1. Cannabis API
  console.log('1. Testing Cannabis API (loyal9.app)...');
  try {
    const res = await fetch('https://api.loyal9.app/strains?q=blue+dream&limit=3', { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json() as any;
      const strains = data.strains || data.data || [];
      console.log('   OK - ' + strains.length + ' strains returned');
      if (strains.length > 0) console.log('   First: ' + (strains[0].name || strains[0].strain_name));
    } else {
      console.log('   HTTP ' + res.status + ' - ' + res.statusText);
    }
  } catch(e: any) {
    console.log('   Error - ' + e.message);
  }

  // 2. PubMed
  console.log('\n2. Testing PubMed API...');
  try {
    const res = await fetch(
      'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=cannabinoid+extraction&retmax=3&retmode=json',
      { signal: AbortSignal.timeout(15000) }
    );
    if (res.ok) {
      const data = await res.json() as any;
      const ids = data.esearchresult?.idlist || [];
      console.log('   OK - ' + ids.length + ' results, IDs: ' + ids.join(', '));
    } else {
      console.log('   HTTP ' + res.status);
    }
  } catch(e: any) {
    console.log('   Error - ' + e.message);
  }

  // 3. OpenAlex
  console.log('\n3. Testing OpenAlex API...');
  try {
    const res = await fetch(
      'https://api.openalex.org/works?search=cannabinoid+extraction&per-page=3',
      { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'HempOS/1.0 (research)' } }
    );
    if (res.ok) {
      const data = await res.json() as any;
      console.log('   OK - ' + (data.meta?.count || '?') + ' total, ' + (data.results || []).length + ' returned');
      if (data.results?.[0]) console.log('   First: ' + (data.results[0].title || '').substring(0, 80));
    } else {
      console.log('   HTTP ' + res.status);
    }
  } catch(e: any) {
    console.log('   Error - ' + e.message);
  }

  // 4. Semantic Scholar
  console.log('\n4. Testing Semantic Scholar API...');
  try {
    const res = await fetch(
      'https://api.semanticscholar.org/graph/v1/paper/search?query=cannabinoid+extraction&limit=3&fields=title,authors',
      { signal: AbortSignal.timeout(15000) }
    );
    if (res.ok) {
      const data = await res.json() as any;
      console.log('   OK - ' + (data.data || []).length + ' results');
      if (data.data?.[0]) console.log('   First: ' + (data.data[0].title || '').substring(0, 80));
    } else {
      console.log('   HTTP ' + res.status);
    }
  } catch(e: any) {
    console.log('   Error - ' + e.message);
  }
}
main();
