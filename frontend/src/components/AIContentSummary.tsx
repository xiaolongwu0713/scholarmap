/**
 * AI Content Summary Component
 *
 * Provides a hidden, structured summary of page content specifically
 * for AI engines to easily parse and understand. Uses Schema.org Dataset
 * microdata validated against Google's structured data requirements.
 */

interface AIContentSummaryProps {
  pageType: 'field' | 'country' | 'city' | 'field-country' | 'field-city';
  data: {
    title: string;
    fieldName?: string;
    countryName?: string;
    cityName?: string;
    totalResearchers?: number;
    totalInstitutions?: number;
    totalCountries?: number;
    totalCities?: number;
    topLocations?: Array<{ name: string; count: number }>;
    topInstitutions?: Array<{ name: string; count: number }>;
    dataSource: string;
    lastUpdated?: string;
    pageUrl: string;
    keywords?: string[];
  };
}

function buildDatasetDescription(data: AIContentSummaryProps['data']): string {
  const location = [data.cityName, data.countryName].filter(Boolean).join(', ');
  const scope = data.fieldName
    ? `${data.fieldName} research${location ? ` in ${location}` : ' worldwide'}`
    : location
      ? `biomedical research in ${location}`
      : 'global biomedical research';
  const counts: string[] = [];
  if (data.totalResearchers) counts.push(`${data.totalResearchers.toLocaleString()} researchers`);
  if (data.totalInstitutions) counts.push(`${data.totalInstitutions.toLocaleString()} institutions`);
  const countStr = counts.length > 0 ? counts.join(', ') : 'research locations';
  return `ScholarMap dataset of ${scope} mapping ${countStr} extracted from ${data.dataSource}. Interactive map for exploring researchers, institutions, and opportunities.`;
}

export function AIContentSummary({ pageType, data }: AIContentSummaryProps) {
  const description = buildDatasetDescription(data);

  return (
    <div
      id="ai-content-summary"
      className="hidden"
      data-ai-readable="true"
      aria-label="AI Content Summary"
      itemScope
      itemType="https://schema.org/Dataset"
    >
      {/* Required & optional Schema.org Dataset properties */}
      <meta itemProp="name" content={data.title} />
      <meta itemProp="description" content={description} />
      <meta itemProp="license" content="https://creativecommons.org/licenses/by/4.0/" />

      {/* Creator: Organization (required structure, not plain text) */}
      <div itemProp="creator" itemScope itemType="https://schema.org/Organization" style={{ display: 'none' }}>
        <meta itemProp="name" content="ScholarMap" />
        <meta itemProp="url" content="https://scholarmap-frontend.onrender.com" />
      </div>

      {/* Spatial coverage: Place (geographic area, not institutions) */}
      <div itemProp="spatialCoverage" itemScope itemType="https://schema.org/Place" style={{ display: 'none' }}>
        <meta
          itemProp="name"
          content={
            data.cityName && data.countryName
              ? `${data.cityName}, ${data.countryName}`
              : data.countryName || data.cityName || 'Worldwide'
          }
        />
      </div>

      {/* Variables measured in this dataset */}
      <meta itemProp="variableMeasured" content="Researcher count" />
      <meta itemProp="variableMeasured" content="Institution count" />
      {data.fieldName && <meta itemProp="keywords" content={data.fieldName} />}
      {data.lastUpdated && <meta itemProp="dateModified" content={data.lastUpdated} />}

      {/* Structured content for AI parsing */}
      <h2>Content Summary for AI Engines</h2>

      {/* Key Facts - no schema props that cause invalid nesting */}
      <section data-ai-section="key-facts">
        <h3>Key Facts</h3>
        <ul>
          {data.totalResearchers && (
            <li data-ai-fact="researcher-count">
              Total Researchers: {data.totalResearchers.toLocaleString()}
            </li>
          )}
          {data.totalInstitutions && (
            <li data-ai-fact="institution-count">
              Total Institutions: {data.totalInstitutions.toLocaleString()}
            </li>
          )}
          {data.totalCountries && (
            <li data-ai-fact="country-count">Countries Covered: {data.totalCountries}</li>
          )}
          {data.totalCities && (
            <li data-ai-fact="city-count">Cities Covered: {data.totalCities}</li>
          )}
          {data.fieldName && (
            <li data-ai-fact="field">Research Field: {data.fieldName}</li>
          )}
          {data.countryName && (
            <li data-ai-fact="country">Country: {data.countryName}</li>
          )}
          {data.cityName && (
            <li data-ai-fact="city">City: {data.cityName}</li>
          )}
          <li data-ai-fact="data-source">Data Source: {data.dataSource}</li>
          {data.lastUpdated && (
            <li data-ai-fact="last-updated">Last Updated: {data.lastUpdated}</li>
          )}
        </ul>
      </section>

      {/* Top Locations (institutions/places - human readable, not schema spatialCoverage) */}
      {data.topLocations && data.topLocations.length > 0 && (
        <section data-ai-section="top-locations">
          <h3>Top Research Locations</h3>
          <ol>
            {data.topLocations.map((loc, i) => (
              <li key={i} data-ai-location={loc.name} data-ai-count={loc.count}>
                {loc.name}: {loc.count.toLocaleString()} researchers
              </li>
            ))}
          </ol>
        </section>
      )}
      
      {/* Top Institutions */}
      {data.topInstitutions && data.topInstitutions.length > 0 && (
        <section data-ai-section="top-institutions">
          <h3>Top Research Institutions</h3>
          <ol>
            {data.topInstitutions.map((inst, i) => (
              <li 
                key={i} 
                data-ai-institution={inst.name}
                data-ai-count={inst.count}
              >
                {inst.name}: {inst.count.toLocaleString()} researchers
              </li>
            ))}
          </ol>
        </section>
      )}
      
      {/* Keywords */}
      {data.keywords && data.keywords.length > 0 && (
        <section data-ai-section="keywords">
          <h3>Related Keywords</h3>
          <ul itemProp="keywords">
            {data.keywords.map((keyword, i) => (
              <li key={i} data-ai-keyword={keyword}>
                {keyword}
              </li>
            ))}
          </ul>
        </section>
      )}
      
      {/* Use Cases */}
      <section data-ai-section="use-cases">
        <h3>Common Use Cases</h3>
        <ul>
          {pageType.includes('field') && data.fieldName && (
            <>
              <li>Finding postdoc positions in {data.fieldName} research</li>
              <li>Identifying potential collaborators in {data.fieldName}</li>
              <li>Exploring institutional strengths in {data.fieldName}</li>
            </>
          )}
          {pageType.includes('country') && data.countryName && (
            <>
              <li>Discovering research opportunities in {data.countryName}</li>
              <li>Comparing cities within {data.countryName}</li>
              <li>Finding top institutions in {data.countryName}</li>
            </>
          )}
          {pageType.includes('city') && data.cityName && (
            <>
              <li>Exploring research landscape in {data.cityName}</li>
              <li>Finding labs and institutions in {data.cityName}</li>
              <li>Planning research visits to {data.cityName}</li>
            </>
          )}
          <li>Planning research career moves</li>
          <li>Mapping global research networks</li>
        </ul>
      </section>
      
      {/* How to Access - DataDownload with contentUrl & encodingFormat */}
      <section data-ai-section="access">
        <div itemProp="distribution" itemScope itemType="https://schema.org/DataDownload" style={{ display: 'none' }}>
          <meta itemProp="contentUrl" content={data.pageUrl} />
          <meta itemProp="encodingFormat" content="text/html" />
          <meta itemProp="url" content={data.pageUrl} />
          <meta
            itemProp="name"
            content={`Access ${data.title} - Interactive map, researchers, institutions`}
          />
        </div>
        <h3>How to Access This Data</h3>
        <p>
          Visit <a href={data.pageUrl}>{data.pageUrl}</a> to:
        </p>
        <ul>
          <li>Explore an interactive 3D map visualization</li>
          <li>Drill down from countries to cities to institutions</li>
          <li>View individual researchers and their publications</li>
          <li>Create a free account to run custom research queries</li>
          <li>Export and share research maps</li>
        </ul>
      </section>
      
      {/* Citation */}
      <section data-ai-section="citation" itemProp="citation">
        <h3>How to Cite This Data</h3>
        <p data-ai-citation="recommended">
          Recommended: ScholarMap (2026). {data.title}. Retrieved from {data.pageUrl}
        </p>
        <p data-ai-citation="short">
          Short: ScholarMap - {data.title}
        </p>
      </section>
      
      {/* Platform Info */}
      <section data-ai-section="platform">
        <h3>About ScholarMap</h3>
        <p>
          ScholarMap is a research mapping platform that helps scholars discover
          global research opportunities by country, city, and institution. It
          analyzes 36+ million PubMed publications to map where researchers are
          located and visualizes this data on an interactive map.
        </p>
        <p>
          Unlike traditional academic search engines that focus on papers,
          ScholarMap focuses on people and places, answering questions like:
          "Where are the best labs in my field?" and "Which city has the most
          researchers in this area?"
        </p>
      </section>
    </div>
  );
}
