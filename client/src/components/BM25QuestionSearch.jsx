import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Edit2, Trash2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { apiService } from '../services/api';

const stripHtml = (value) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const BM25QuestionSearch = ({
  isDarkMode,
  onEditQuestion,
  onRequestEdit,
  onDeleteQuestion,
  onSearchStateChange,
  resultsMountId,
  courseId,
  subjectId,
  topicId,
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
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
          courseId,
          subjectId,
          topicId,
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
  }, [debouncedQuery, courseId, subjectId, topicId]);

  const totalPages = Math.max(1, Math.ceil(response.results.length / pageSize));

  const pagedResults = useMemo(() => {
    const start = (page - 1) * pageSize;
    return response.results.slice(start, start + pageSize);
  }, [page, response.results]);

  const resultsContent = !debouncedQuery ? null : isLoading ? (
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
            {pagedResults.map((item, index) => {
              const canEdit = item?.canEdit === true;
              const canDelete = item?.canDelete === true;
              const canRequestEdit = !canEdit && typeof onRequestEdit === 'function';

              return (
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
                <div className="actions-cell">
                  {canEdit && (
                    <button
                      type="button"
                      className="action-edit"
                      onClick={() => onEditQuestion?.(item)}
                      aria-label="Edit question"
                      title="Edit question"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  {canRequestEdit && (
                    <button
                      type="button"
                      className="action-request"
                      onClick={() => onRequestEdit?.(item)}
                      aria-label="Request edit permission"
                      title="Request edit permission"
                    >
                      <FileText size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="action-delete"
                      onClick={() => onDeleteQuestion?.(item.id)}
                      aria-label="Delete question"
                      title="Delete question"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </article>
            );})}
          </div>

          <div className="bm25-pagination">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </>
  );

  const resultsMountNode = (typeof document !== 'undefined' && resultsMountId)
    ? document.getElementById(resultsMountId)
    : null;

  return (
    <>
      <div className={`bm25-search-panel ${isDarkMode ? 'dark' : ''}`}>
        <div className={`search-bar ${isDarkMode ? 'dark' : ''}`}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
          />
        </div>
      </div>
      {resultsMountNode ? createPortal(resultsContent, resultsMountNode) : resultsContent}
    </>
  );
};

export default BM25QuestionSearch;
    