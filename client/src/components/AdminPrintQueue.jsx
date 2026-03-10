import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import '../styles/AdminPrintQueue.css';
import UPHSLLogo from '../assets/UPHSL Logo.png';

const loadImageAsDataUrl = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    resolve(canvas.toDataURL('image/png'));
  };
  img.onerror = reject;
  img.src = src;
});

const AdminPrintQueue = () => {
  const { user } = useAuth();
  const [printRequests, setPrintRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showMasterSetModal, setShowMasterSetModal] = useState(false);
  const [masterSetData, setMasterSetData] = useState(null);

  useEffect(() => {
    loadPrintRequests();
  }, []);

  const loadPrintRequests = async () => {
    try {
      setLoading(true);
      const requests = await apiService.getPendingPrintRequests();
      setPrintRequests(requests);
    } catch (err) {
      console.error('Failed to load print requests:', err);
      setError('Failed to load print requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMasterSet = async (request) => {
    try {
      setLoading(true);
      setSelectedRequest(request);
      const data = await apiService.getMasterSet(request.printRequestId);
      setMasterSetData(data);
      setShowMasterSetModal(true);
    } catch (err) {
      console.error('Failed to load master set:', err);
      setError('Failed to load master set data');
    } finally {
      setLoading(false);
    }
  };

  const openPrintWindow = (html) => {
    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const buildFilename = (suffix) => {
    if (!masterSetData?.testInfo) return `MasterSet_${suffix}`;
    const now = new Date();
    const date = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`;
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const base = `${masterSetData.testInfo.examType}_${masterSetData.testInfo.semester}_${masterSetData.testInfo.schoolYear}_${date}_${time}`;
    return `${base}_${suffix}`;
  };

  const getOrderedOptions = (options = []) => {
    return options
      .map((option, idx) => ({
        ...option,
        content: option.optionText || option.content || '',
        _normalizedOrder: option.displayOrder ?? idx,
        _originalIndex: idx,
        _isCorrect: option.isCorrect || false
      }))
      .sort((a, b) => {
        if (a._normalizedOrder === b._normalizedOrder) return a._originalIndex - b._originalIndex;
        return a._normalizedOrder - b._normalizedOrder;
      });
  };

  const getCorrectLetter = (question) => {
    const options = getOrderedOptions(question.options || []);
    if (!options.length) return '—';
    const correctIndex = options.findIndex(opt => opt._isCorrect);
    return correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : '—';
  };

  const printTableOfSpecifications = async () => {
    if (!masterSetData?.testInfo?.specificationSnapshot) {
      setError('No Table of Specifications available for this exam');
      return;
    }

    let parsedSpec;
    try {
      parsedSpec = JSON.parse(masterSetData.testInfo.specificationSnapshot);
    } catch (err) {
      setError('Failed to parse specification data');
      return;
    }

    const totals = parsedSpec.totals || { low: 0, middle: 0, high: 0, grand: 0 };
    const filename = buildFilename('TOS');

    const tableRows = parsedSpec.specs.map((spec) => `
      <tr>
        <td class="text-left"><strong>${spec.topicName}</strong></td>
        <td>${spec.hours || '—'}</td>
        <td>${spec.cognitive?.low?.count || 0}</td>
        <td class="text-left">${(spec.cognitive?.low?.placements || []).join(', ')}</td>
        <td>${spec.cognitive?.middle?.count || 0}</td>
        <td class="text-left">${(spec.cognitive?.middle?.placements || []).join(', ')}</td>
        <td>${spec.cognitive?.high?.count || 0}</td>
        <td class="text-left">${(spec.cognitive?.high?.placements || []).join(', ')}</td>
        <td><strong>${spec.total || 0}</strong></td>
        <td><strong>${spec.percentage || 0}%</strong></td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Table of Specification</title>
          <style>
            @page {
              size: Legal portrait;
              margin: 0.5in;
            }
            * { color: #000; }
            body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { font-size: 18px; margin: 5px 0; font-weight: bold; color: #000; }
            .header p { margin: 3px 0; color: #000; }
            .filename { font-weight: bold; margin: 10px 0; font-size: 13px; color: #000; }
            h2 { text-align: center; margin: 20px 0; color: #000; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            table, th, td { border: 1px solid #000; }
            th { 
              background-color: #fff; 
              color: #000;
              padding: 12px 6px; 
              text-align: center; 
              font-weight: bold; 
              border: 1px solid #000;
              font-size: 12px;
            }
            td { 
              border: 1px solid #000; 
              padding: 10px 6px; 
              text-align: center;
              color: #000;
              font-size: 12px;
            }
            td.text-left { text-align: left; }
            .total-row { font-weight: bold; background-color: #fff; }
            @media print {
              body { margin: 0; padding: 10px; }
              table { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>University of Perpetual Help System</h1>
            <p>Test Data Bank System</p>
            <p>Biñan Campus</p>
            <div class="filename">${filename}</div>
            <p><strong style="color: #000;">${masterSetData.testInfo.course || 'Program'}</strong></p>
          </div>
          
          <h2>Table of Specification</h2>
          
          <table border="1" cellpadding="5" cellspacing="0">
            <thead>
              <tr>
                <th rowspan="2" style="width: 100px;">Topics</th>
                <th rowspan="2" style="width: 60px;">Hours</th>
                <th colspan="2" style="width: 140px;">Remembering & Understanding (30%)</th>
                <th colspan="2" style="width: 140px;">Applying & Analyzing (30%)</th>
                <th colspan="2" style="width: 140px;">Evaluating & Creating (40%)</th>
                <th rowspan="2" style="width: 70px;">Total Items</th>
                <th rowspan="2" style="width: 70px;">Percentage</th>
              </tr>
              <tr>
                <th style="width: 70px;">No. Questions</th>
                <th style="width: 70px;">Placement</th>
                <th style="width: 70px;">No. Questions</th>
                <th style="width: 70px;">Placement</th>
                <th style="width: 70px;">No. Questions</th>
                <th style="width: 70px;">Placement</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              <tr class="total-row">
                <td colspan="2"><strong>TOTALS</strong></td>
                <td><strong>${totals.low || 0}</strong></td>
                <td><strong>All</strong></td>
                <td><strong>${totals.middle || 0}</strong></td>
                <td><strong>All</strong></td>
                <td><strong>${totals.high || 0}</strong></td>
                <td><strong>All</strong></td>
                <td><strong>${totals.grand || 0}</strong></td>
                <td><strong>100%</strong></td>
              </tr>
            </tbody>
          </table>
          
          <div class="signature-section" style="margin-top:90px;">
            <div style="display:flex; justify-content:space-between; gap:20px;">
              <div style="flex:1; display:flex; align-items:center;">
                <span style="display:inline-block; width:auto; white-space:nowrap;">Prepared By:</span>
                <span style="display:inline-block; width:160px; border-bottom:1px solid #000; margin-left:1px; transform:translateY(6px);"></span>
              </div>
              <div style="flex:1; display:flex; align-items:center; justify-content:flex-end;">
                <span style="display:inline-block; width:auto; white-space:nowrap;">Assessed By:</span>
                <span style="display:inline-block; width:160px; border-bottom:1px solid #000; margin-left:1px; transform:translateY(6px);"></span>
              </div>
            </div>
            <div style="display:flex; justify-content:center; margin-top:40px;">
              <div style="width:60%; display:flex; align-items:center; justify-content:center;">
                <span style="display:inline-block; width:auto; white-space:nowrap;">Approved By:</span>
                <span style="display:inline-block; width:220px; border-bottom:1px solid #000; margin-left:1px; transform:translateY(6px);"></span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    openPrintWindow(html);
  };

  const printExamPaper = async () => {
    if (!masterSetData?.questions?.length) {
      setError('No questions available for this exam');
      return;
    }

    const logoDataUrl = await loadImageAsDataUrl(UPHSLLogo);
    const filename = buildFilename('Exam');

    const questionHtml = masterSetData.questions.map((question, index) => {
      const options = getOrderedOptions(question.options || []);
      const choices = options.map((option, idx) => `
        <div class="choice-item">
          <span class="choice-letter">${String.fromCharCode(65 + idx)}.</span> ${option.content}
        </div>
      `).join('');
      return `
        <div class="question-item">
          <div class="question-text">${index + 1}.) ${question.questionText}</div>
          <div class="choices">${choices}</div>
        </div>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <title>Exam Paper</title>
          <style>
            @page {
              size: Legal portrait;
              margin: 0.5in;
            }
            * { color: #000; }
            body { font-family: Arial, sans-serif; margin: 20px; color: #000; line-height: 1.6; }
            .exam-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 20px; padding-bottom: 15px; }
            .logo-section { flex-shrink: 0; }
            .logo-section img { height: 140px; width: auto; }
            .header-text { flex: 1; text-align: center; }
            .header-text h2 { font-size: 18px; margin: 5px 0; font-weight: bold; color: #000; }
            .header-text p { margin: 3px 0; color: #000; font-size: 14px; }
            .filename { font-weight: bold; margin: 8px 0; font-size: 12px; color: #000; }
            .program-info { font-weight: bold; font-size: 15px; margin: 10px 0; color: #000; }
            .form-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
            .form-field { display: flex; align-items: center; gap: 5px; }
            .form-field label { color: #000; font-size: 14px; white-space: nowrap; }
            .form-field-blank { flex: 1; border-bottom: 1px solid #000; min-width: 150px; height: 0; }
            .reminders { margin: 15px 0; font-size: 13px; color: #000; }
            .reminders p { margin: 5px 0; }
            .questions-section { margin: 20px 0; }
            .question-item { margin-bottom: 15px; color: #000; }
            .question-text { font-weight: normal; margin-bottom: 5px; font-size: 14px; }
            .choices { display: flex; flex-wrap: wrap; gap: 15px; margin-left: 20px; }
            .choice-item { font-size: 14px; flex: 1 1 calc(25% - 15px); min-width: 120px; word-wrap: break-word; white-space: normal; }
            .choice-letter { font-weight: normal; }
            @media print {
              body { margin: 0; padding: 10px; }
              .question-item { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="exam-header">
            <div class="logo-section"><img src="${logoDataUrl}" alt="UPHSL Logo" /></div>
            <div class="header-text">
              <h2>University of Perpetual Help System</h2>
              <p>Test Data Bank System</p>
              <p>Biñan Campus</p>
              <div class="filename">${filename}</div>
              <p class="program-info">${masterSetData.testInfo.course || 'Program'}</p>
            </div>
          </div>
          <div class="form-fields">
            <div class="form-field">
              <label>Name:</label>
              <div class="form-field-blank"></div>
            </div>
            <div class="form-field">
              <label>Date:</label>
              <div class="form-field-blank"></div>
            </div>
            <div class="form-field">
              <label>Professor:</label>
              <div class="form-field-blank"></div>
            </div>
            <div class="form-field">
              <label>Permit #:</label>
              <div class="form-field-blank"></div>
            </div>
          </div>
          <div class="reminders">
            <p><strong>REMINDER: CHEATING during examinations, BORROWING and LENDING of examination permit fall under Major offenses and are punishable under the existing University Policy</strong></p>
            <p><strong>Direction:</strong> Multiple Choice: Choose the letter of the correct answer.</p>
          </div>
          <div class="questions-section">
            ${questionHtml}
          </div>
        </body>
      </html>
    `;

    openPrintWindow(html);
  };

  const printAnswerKey = async () => {
    if (!masterSetData?.questions?.length) {
      setError('No questions available for answer key');
      return;
    }

    const logoDataUrl = await loadImageAsDataUrl(UPHSLLogo);
    const filename = buildFilename('AnswerKey');

    const totalAnswers = masterSetData.questions.length;
    const cols = totalAnswers > 75 ? 3 : 2;
    const answerFontSize = cols === 3 ? '10px' : '11px';

    const renderAnswersHTML = masterSetData.questions.map((question, index) => {
      const correctLetter = getCorrectLetter(question);
      return '<div class="answer-item"><span class="question-num">' + (index + 1) + '.</span> <span class="answer-letter">' + correctLetter + '</span></div>';
    }).join('');

    const html = `
      <html>
        <head>
          <title>Answer Key</title>
          <style>
            @page {
              size: Legal portrait;
              margin: 0.5in;
            }
            * { color: #000; }
            body { font-family: Arial, sans-serif; margin: 12px; color: #000; line-height: 1.25; }
            .exam-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; padding-bottom: 8px; }
            .logo-section { flex-shrink: 0; }
            .logo-section img { height: 90px; width: auto; }
            .header-text { flex: 1; text-align: center; }
            .header-text h2 { font-size: 15px; margin: 2px 0; font-weight: bold; color: #000; }
            .header-text p { margin: 2px 0; color: #000; font-size: 11px; }
            .program-info { font-weight: bold; font-size: 12px; margin: 4px 0; color: #000; }
            .filename { font-weight: bold; margin: 4px 0; font-size: 10px; color: #000; }
            .answer-title { font-weight: bold; text-align: center; font-size: 14px; margin: 8px 0; }

            .answers-section {
              margin: 6px 0;
              -webkit-column-count: ${cols};
              -moz-column-count: ${cols};
              column-count: ${cols};
              -webkit-column-gap: 14px;
              -moz-column-gap: 14px;
              column-gap: 14px;
              -webkit-column-fill: auto;
              -moz-column-fill: auto;
              column-fill: auto;
            }

            .answer-item { font-size: ${answerFontSize}; margin: 4px 0; color: #000; display: inline-block; width: 100%; }
            .question-num { font-weight: normal; display: inline-block; width: 28px; }
            .answer-letter { font-weight: bold; display: inline-block; width: 20px; }

            @media print {
              @page { size: auto; margin: 8mm; }
              body { margin: 0; padding: 0; }
              .answers-section { column-count: 3; column-gap: 12px; }
              .answer-item { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="exam-header">
            <div class="logo-section">
              <img src="${logoDataUrl}" alt="UPHSL Logo" />
            </div>
            <div class="header-text">
              <h2>University of Perpetual Help System</h2>
              <p>Test Data Bank System</p>
              <p>Biñan Campus</p>
              <div class="filename">${filename}</div>
              <p class="program-info">${masterSetData.testInfo.course || 'Program'}</p>
            </div>
          </div>

          <div class="answer-title">ANSWER KEY</div>

          <div class="answers-section">
            ${renderAnswersHTML}
          </div>
        </body>
      </html>
    `;

    openPrintWindow(html);
  };

  const handlePrintMasterSet = async () => {
    // Print all three documents sequentially
    try {
      await printTableOfSpecifications();
      setTimeout(async () => {
        await printExamPaper();
        setTimeout(async () => {
          await printAnswerKey();
        }, 500);
      }, 500);
    } catch (err) {
      console.error('Failed to print master set:', err);
      setError('Failed to print master set');
    }
  };

  const handleUpdateStatus = async (printRequestId, status) => {
    try {
      setLoading(true);
      await apiService.updatePrintRequestStatus(printRequestId, status);
      setSuccess(`Print request marked as ${status}`);
      await loadPrintRequests();
      setShowMasterSetModal(false);
      setSelectedRequest(null);
      setMasterSetData(null);
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update print request status');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowMasterSetModal(false);
    setSelectedRequest(null);
    setMasterSetData(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getCorrectAnswer = (options) => {
    const correctOption = options.find(o => o.isCorrect);
    if (!correctOption) return 'N/A';
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    return letters[correctOption.displayOrder] || 'N/A';
  };

  return (
    <div className="admin-print-queue">
      <div className="queue-header">
        <h2>Print Request Queue</h2>
        <button className="btn btn-secondary" onClick={loadPrintRequests} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {loading && !showMasterSetModal ? (
        <div className="loading">Loading print requests...</div>
      ) : printRequests.length === 0 ? (
        <div className="empty-state">
          <p>No pending print requests</p>
        </div>
      ) : (
        <div className="requests-table-container">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Requested By</th>
                <th>Exam Title</th>
                <th>Department</th>
                <th>Copies</th>
                <th>Date Requested</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {printRequests.map(request => (
                <tr key={request.printRequestId}>
                  <td>{request.requestedBy}</td>
                  <td>{request.testTitle}</td>
                  <td>{request.departmentName}</td>
                  <td className="text-center">{request.copiesRequested}</td>
                  <td>{formatDate(request.createdAt)}</td>
                  <td>
                    <span className={`status-badge status-${request.status.toLowerCase()}`}>
                      {request.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleViewMasterSet(request)}
                      disabled={loading}
                    >
                      View & Print
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleUpdateStatus(request.printRequestId, 'Rejected')}
                      disabled={loading}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Master Set Modal */}
      {showMasterSetModal && masterSetData && (
        <div className="modal-overlay">
          <div className="modal-content master-set-modal">
            <div className="modal-header no-print">
              <h3>Master Set - {masterSetData.testInfo?.title}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="no-print modal-actions-top">
              <button className="btn btn-primary" onClick={handlePrintMasterSet}>
                🖨️ Print All (TOS + Exam + Answer Key)
              </button>
              <button className="btn btn-secondary" onClick={printTableOfSpecifications}>
                Print TOS Only
              </button>
              <button className="btn btn-secondary" onClick={printExamPaper}>
                Print Exam Only
              </button>
              <button className="btn btn-secondary" onClick={printAnswerKey}>
                Print Answer Key Only
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleUpdateStatus(selectedRequest.printRequestId, 'ReadyForPickup')}
              >
                ✓ Mark as Ready for Pickup
              </button>
              <button className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
            </div>

            {/* Printable Content */}
            <div className="master-set-content printable">
              {/* Cover Page */}
              <div className="cover-page page-break">
                <h1>MASTER SET</h1>
                <div className="exam-info">
                  <p><strong>Exam Title:</strong> {masterSetData.testInfo?.title}</p>
                  <p><strong>Subject:</strong> {masterSetData.testInfo?.subject}</p>
                  <p><strong>Course:</strong> {masterSetData.testInfo?.course}</p>
                  <p><strong>Department:</strong> {masterSetData.testInfo?.department}</p>
                  <p><strong>Exam Type:</strong> {masterSetData.testInfo?.examType}</p>
                  <p><strong>Semester:</strong> {masterSetData.testInfo?.semester}</p>
                  <p><strong>School Year:</strong> {masterSetData.testInfo?.schoolYear}</p>
                  <p><strong>Set Label:</strong> {masterSetData.testInfo?.setLabel}</p>
                  <p><strong>Duration:</strong> {masterSetData.testInfo?.durationMinutes} minutes</p>
                  <p><strong>Total Items:</strong> {masterSetData.testInfo?.totalQuestions}</p>
                  <p><strong>Total Points:</strong> {masterSetData.testInfo?.totalPoints}</p>
                </div>
                <div className="print-info">
                  <p><strong>Requested By:</strong> {masterSetData.printRequest?.requestedBy}</p>
                  <p><strong>Copies Requested:</strong> {masterSetData.printRequest?.copiesRequested}</p>
                  {masterSetData.printRequest?.notes && (
                    <p><strong>Notes:</strong> {masterSetData.printRequest?.notes}</p>
                  )}
                </div>
              </div>

              {/* Table of Specifications */}
              {masterSetData.testInfo?.specificationSnapshot && (
                <div className="tos-page page-break">
                  <h2>Table of Specifications</h2>
                  <div dangerouslySetInnerHTML={{ __html: masterSetData.testInfo.specificationSnapshot }} />
                </div>
              )}

              {/* Exam Paper */}
              <div className="exam-paper page-break">
                <h2>Exam Paper</h2>
                <div className="instructions">
                  <p><strong>Instructions:</strong> Choose the best answer for each question.</p>
                  <p><strong>Duration:</strong> {masterSetData.testInfo?.durationMinutes} minutes</p>
                </div>
                {masterSetData.questions?.map((q, idx) => (
                  <div key={idx} className="question-block">
                    <div className="question-header">
                      <strong>{idx + 1}.</strong> <span dangerouslySetInnerHTML={{ __html: q.questionText }} />
                    </div>
                    <div className="options-list">
                      {q.options?.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <div key={optIdx} className="option-item">
                            <strong>{letter}.</strong> <span dangerouslySetInnerHTML={{ __html: opt.optionText }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Answer Key */}
              <div className="answer-key page-break">
                <h2>Answer Key</h2>
                <div className="answer-grid">
                  {masterSetData.questions?.map((q, idx) => (
                    <div key={idx} className="answer-item">
                      <span className="question-no">{idx + 1}.</span>
                      <span className="answer">{getCorrectAnswer(q.options)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPrintQueue;
