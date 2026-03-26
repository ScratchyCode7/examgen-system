import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { apiService } from '../services/api';

const BLOOM_FILTERS = [
  { value: '', label: 'All Bloom Levels' },
  { value: 'Remember', label: 'Remember' },
  { value: 'Understand', label: 'Understand' },
  { value: 'Apply', label: 'Apply' },
  { value: 'Analyze', label: 'Analyze' },
  { value: 'Evaluate', label: 'Evaluate' },
  { value: 'Create', label: 'Create' },
];

const QUESTION_TYPE_FILTERS = [
  { value: '', label: 'All Question Types' },
  { value: 'MultipleChoice', label: 'Multiple Choice' },
  { value: 'TrueFalse', label: 'True or False' },
  { value: 'Essay', label: 'Essay' },
];

const stripHtml = (value) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const BM25QuestionSearch = ({
  isDarkMode,
  subjects,
  topics,
  selectedSubjectId,
  selectedTopicId,
  onEditQuestion,
  onDeleteQuestion,
  onSearchStateChange,
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [bloomFilter, setBloomFilter] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState({ results: [], totalCount: 0, executionTime: 0, similarCount: 0 });
  const [page, setPage] = useState(1);

  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const selectedSubject = subjects.find((item) => String(item.id) === String(selectedSubjectId));
    const selectedTopic = topics.find((item) => String(item.id) === String(selectedTopicId));

    setSubjectFilter(selectedSubject?.name || '');
    setTopicFilter(selectedTopic?.title || '');
  }, [selectedSubjectId, selectedTopicId, subjects, topics]);

  useEffect(() => {
    onSearchStateChange?.(Boolean(debouncedQuery));
  }, [debouncedQuery, onSearchStateChange]);

  useEffect(() => {
    let isDisposed = false;

    const runSearch = async () => {
      if (!debouncedQuery) {
        setResponse({ results: [], totalCount: 0, executionTime: 0, similarCount: 0 });
        setError('');
        return;
      }

      try {
        setIsLoading(true);
        setError('');

        const result = await apiService.searchQuestions({
          q: debouncedQuery,
          subject: subjectFilter || undefined,
          topic: topicFilter || undefined,
          bloomLevel: bloomFilter || undefined,
          questionType: questionTypeFilter || undefined,
        });

        if (!isDisposed) {
          setResponse({
            results: Array.isArray(result?.results) ? result.results : [],
            totalCount: Number(result?.totalCount || 0),
            executionTime: Number(result?.executionTime || 0),
            similarCount: Number(result?.similarCount || 0),
          });
          setPage(1);
        }
      } catch (err) {
        if (!isDisposed) {
          setError('Failed to run ranked search. Please try again.');
          setResponse({ results: [], totalCount: 0, executionTime: 0, similarCount: 0 });
        }
      } finally {
        if (!isDisposed) {
          setIsLoading(false);
        }
      }
    };

    void runSearch();

    return () => {
      isDisposed = true;
    };
  }, [debouncedQuery, subjectFilter, topicFilter, bloomFilter, questionTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(response.results.length / pageSize));

  const pagedResults = useMemo(() => {
    const start = (page - 1) * pageSize;
    return response.results.slice(start, start + pageSize);
  }, [page, response.results]);

  return (
    <div className={`bm25-search-panel ${isDarkMode ? 'dark' : ''}`}>
      <div className="bm25-search-input-row">
        <Search size={18} className="bm25-search-icon" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search questions with BM25 ranking..."
          className={isDarkMode ? 'dark' : ''}
        />
      </div>

      <div className="bm25-filter-grid">
        <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map((item) => (
            <option key={item.id} value={item.name}>{item.name}</option>
          ))}
        </select>

        <select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}>
          <option value="">All Topics</option>
          {topics.map((item) => (
            <option key={item.id} value={item.title}>{item.title}</option>
          ))}
        </select>

        <select value={bloomFilter} onChange={(event) => setBloomFilter(event.target.value)}>
          {BLOOM_FILTERS.map((item) => (
            <option key={item.value || 'all'} value={item.value}>{item.label}</option>
          ))}
        </select>

        <select value={questionTypeFilter} onChange={(event) => setQuestionTypeFilter(event.target.value)}>
          {QUESTION_TYPE_FILTERS.map((item) => (
            <option key={item.value || 'all'} value={item.value}>{item.label}</option>
          ))}
        </select>
      </div>

      {!debouncedQuery ? (
        <div className="bm25-empty-state">Type a query to start ranked search.</div>
      ) : isLoading ? (
        <div className="bm25-empty-state">Searching...</div>
      ) : error ? (
        <div className="bm25-empty-state bm25-error">{error}</div>
      ) : (
        <>
          <div className="bm25-result-summary">
            <span>About {response.totalCount} results ({response.executionTime} ms)</span>
            <span>{response.similarCount} highly similar questions</span>
          </div>

          {response.results.length === 0 ? (
            <div className="bm25-empty-state">No results found</div>
          ) : (
            <>
              <div className="bm25-result-list">
                {pagedResults.map((item, index) => (
                  <article key={item.id} className="bm25-result-item">
                    <div className="bm25-result-heading">
                      <strong>#{(page - 1) * pageSize + index + 1}</strong>
                      <span>Score: {Number(item.score || 0).toFixed(3)}</span>
                    </div>
                    <p className="bm25-result-text">{stripHtml(item.content)}</p>
                    <div className="bm25-result-meta">
                      <span>{item.subject || 'N/A'}</span>
                      <span>{item.topic || 'N/A'}</span>
                      <span>{item.bloomLevel}</span>
                      <span>{item.questionType}</span>
                    </div>
                    <div className="bm25-result-actions">
                      <button type="button" className="action-edit" onClick={() => onEditQuestion?.(item)}>Edit</button>
                      <button type="button" className="action-delete" onClick={() => onDeleteQuestion?.(item.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="bm25-pagination">
                <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>Previous</button>
                <span>Page {page} of {totalPages}</span>
                <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>Next</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default BM25QuestionSearch;
