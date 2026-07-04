/**
 * OpenAPI 3.0 Documentation Generator
 *
 * Auto-generates API documentation from route registrations.
 * Accessible at GET /api/integration/openapi.json
 */

export interface APIRoute {
  method: string;
  path: string;
  summary: string;
  description: string;
  parameters?: { name: string; in: string; required: boolean; schema: { type: string } }[];
  requestBody?: { required: boolean; content: Record<string, { schema: any }> };
  responses: Record<string, { description: string }>;
}

export class APIDocsService {
  private routes: APIRoute[] = [];

  register(route: APIRoute) {
    this.routes.push(route);
  }

  /**
   * Register all known integration routes
   */
  registerAll() {
    // Health
    this.register({ method: 'GET', path: '/health', summary: 'System health check', description: 'Returns HTTP 200 if server is running', responses: { '200': { description: 'OK' } } });

    // Market Intelligence
    this.register({ method: 'GET', path: '/market/prices', summary: 'Latest cannabis prices by state', description: 'Returns the most recent price per ounce for high/medium/low quality cannabis across all 51 states', responses: { '200': { description: 'Price data' } } });
    this.register({ method: 'GET', path: '/market/states', summary: 'State market summaries', description: 'Full state summary with average prices, transaction counts, and demographics', parameters: [{ name: 'state', in: 'query', required: false, schema: { type: 'string' } }], responses: { '200': { description: 'State summaries' } } });
    this.register({ method: 'GET', path: '/market/trends/:state', summary: 'Monthly price trends', description: 'Month-over-month price trends for a specific state', parameters: [{ name: 'state', in: 'path', required: true, schema: { type: 'string' } }, { name: 'months', in: 'query', required: false, schema: { type: 'integer' } }], responses: { '200': { description: 'Trend data' } } });
    this.register({ method: 'GET', path: '/market/legal-status', summary: 'Price by legal status', description: 'Comparison of cannabis pricing across different legal status categories', responses: { '200': { description: 'Legal status analysis' } } });

    // Cross-Reference Insights
    this.register({ method: 'GET', path: '/insights/all', summary: 'All cross-reference insights', description: 'Returns all 15+ data-driven insights combining market, research, strain, and chemistry data', responses: { '200': { description: 'Insights array' } } });
    this.register({ method: 'GET', path: '/insights/market-legal', summary: 'Prohibition tax analysis', description: 'Quantifies the price premium paid in illegal vs legal states', responses: { '200': { description: 'Market-legal insight' } } });
    this.register({ method: 'GET', path: '/insights/strain-chemotypes', summary: 'Chemotype distribution', description: 'Strain classification into Type I/II/III based on cannabinoid ratios', responses: { '200': { description: 'Chemotype insight' } } });

    // Strain Intelligence
    this.register({ method: 'GET', path: '/strains/network', summary: 'Strain similarity network', description: 'Cytoscape.js-ready graph of 465+ strains with similarity edges', responses: { '200': { description: 'Network elements' } } });
    this.register({ method: 'GET', path: '/strains/chemotypes', summary: 'Chemotype clusters', description: 'Strains grouped by cannabinoid profile (High THC, CBD-Dominant, etc.)', responses: { '200': { description: 'Cluster data' } } });
    this.register({ method: 'GET', path: '/strains/similar/:name', summary: 'Similar strain finder', description: 'Finds strains with similar cannabinoid profiles and effects', parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Similar strains' } } });

    // Pipeline
    this.register({ method: 'POST', path: '/pipeline/run', summary: 'Run autonomous pipeline', description: 'Executes the full 4-stage autonomous research pipeline', responses: { '200': { description: 'Pipeline results' } } });
    this.register({ method: 'GET', path: '/pipeline/runs', summary: 'Pipeline run history', description: 'Recent pipeline execution history with stage-level timing', responses: { '200': { description: 'Run history' } } });
    this.register({ method: 'GET', path: '/pipeline/stats', summary: 'Pipeline statistics', description: 'Aggregate pipeline stats: total runs, insights, papers generated', responses: { '200': { description: 'Stats' } } });

    // Charts
    this.register({ method: 'GET', path: '/charts/dashboard', summary: 'All dashboard charts', description: '8 visualization-ready chart datasets for a unified dashboard', responses: { '200': { description: 'Chart data' } } });
    this.register({ method: 'GET', path: '/charts/market-trends', summary: 'Market price trends chart', description: 'Line chart data for national or state-level price trends', responses: { '200': { description: 'Trend chart' } } });
    this.register({ method: 'GET', path: '/charts/thc-distribution', summary: 'THC distribution histogram', description: 'Strain count by THC potency range', responses: { '200': { description: 'Distribution chart' } } });

    // Education Content
    this.register({ method: 'GET', path: '/content/article/:strain', summary: 'Strain explainer article', description: 'Plain-English article explaining a strain\'s effects, lineage, and chemistry', parameters: [{ name: 'strain', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Article' } } });
    this.register({ method: 'GET', path: '/content/infographic', summary: 'System infographic data', description: 'Key metrics and comparisons for visual infographic rendering', responses: { '200': { description: 'Infographic data' } } });
    this.register({ method: 'GET', path: '/content/social-thread', summary: 'Social media content', description: 'Ready-to-post social media thread about cannabis education', responses: { '200': { description: 'Thread content' } } });

    // PubChem
    this.register({ method: 'GET', path: '/pubchem/cannabinoids', summary: 'Cannabinoid molecular properties', description: 'Molecular properties for 17 major cannabinoids from NIH PubChem', responses: { '200': { description: 'Cannabinoid data' } } });
    this.register({ method: 'GET', path: '/pubchem/compare/:a/:b', summary: 'Molecular comparison', description: 'Compare two cannabinoids by molecular properties and Tanimoto similarity', parameters: [{ name: 'a', in: 'path', required: true, schema: { type: 'string' } }, { name: 'b', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Comparison' } } });

    // Enterprise Forms
    this.register({ method: 'POST', path: '/forms/:formType', summary: 'Submit enterprise form', description: 'Submit any of 10 integration forms (model-validation, lab-integration, dataset-registration, etc.)', responses: { '200': { description: 'Form submitted' } } });
    this.register({ method: 'GET', path: '/forms/stats', summary: 'Form statistics', description: 'Aggregate counts across all 10 enterprise form types', responses: { '200': { description: 'Stats' } } });

    // Monitoring
    this.register({ method: 'GET', path: '/monitor/metrics', summary: 'Prometheus metrics', description: 'System metrics in Prometheus text format for Grafana ingestion', responses: { '200': { description: 'Metrics' } } });
    this.register({ method: 'GET', path: '/monitor/health', summary: 'System health check', description: 'Comprehensive health check across all system components', responses: { '200': { description: 'Health status' } } });
    this.register({ method: 'GET', path: '/monitor/freshness', summary: 'Data freshness', description: 'Last-updated timestamps for all datasets', responses: { '200': { description: 'Freshness data' } } });
    this.register({ method: 'GET', path: '/openapi.json', summary: 'API documentation', description: 'OpenAPI 3.0 specification for all endpoints', responses: { '200': { description: 'OpenAPI spec' } } });
  }

  /**
   * Generate OpenAPI 3.0 JSON specification
   */
  generateSpec(): Record<string, any> {
    this.registerAll();

    const paths: Record<string, any> = {};

    for (const route of this.routes) {
      if (!paths[route.path]) {paths[route.path] = {};}
      paths[route.path][route.method.toLowerCase()] = {
        summary: route.summary,
        description: route.description,
        parameters: route.parameters,
        requestBody: route.requestBody,
        responses: route.responses,
      };
    }

    return {
      openapi: '3.0.0',
      info: {
        title: 'Hemp OS API',
        version: '2.0.0',
        description: 'Scientific operating system for hemp processing, biomanufacturing simulation, and computational research. Combines thermodynamic simulation, strain genetics, market intelligence, and autonomous research pipelines.',
      },
      servers: [{ url: '/api/integration', description: 'Integration API' }],
      paths,
    };
  }
}

export const apiDocs = new APIDocsService();
