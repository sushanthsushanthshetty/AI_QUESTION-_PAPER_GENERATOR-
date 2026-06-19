import React, { useState, useEffect } from 'react';
import { Layers, Upload, Download, RefreshCw, CheckCircle, AlertTriangle, BookOpen, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

// Helper to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('jwtToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export default function AnswerKeyPage() {
  const { user } = useAuth();
  const [page] = useState('answer-key');

  // Paper list
  const [savedPapers, setSavedPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);

  // PDF upload
  const [uploading, setUploading] = useState(false);
  const [syllabusChunks, setSyllabusChunks] = useState([]);

  // Answer generation
  const [generating, setGenerating] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState(null);
  const [alertMsg, setAlertMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const response = await fetch('/api/papers', { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) setSavedPapers(data.papers || []);
    } catch (err) {
      console.error('Error fetching papers:', err);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setAlertMsg('Please select a PDF file.');
      setTimeout(() => setAlertMsg(null), 5000);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('syllabus', file);
      const response = await fetch('/api/syllabus/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('jwtToken')}` },
        body: formData
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');
      setSyllabusChunks(data.chunks || []);
      setSuccessMsg(`PDF processed: ${data.chunkCount || 0} topics extracted!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setAlertMsg(`PDF Upload Error: ${err.message}`);
      setTimeout(() => setAlertMsg(null), 5000);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!selectedPaper) return;
    if (!syllabusChunks || syllabusChunks.length === 0) return;

    const paperId = selectedPaper.paperId || selectedPaper.id;
    if (!paperId) {
      setAlertMsg('Selected paper has no valid ID.');
      setTimeout(() => setAlertMsg(null), 5000);
      return;
    }

    // Verify chunks are non-empty before sending
    if (!Array.isArray(syllabusChunks) || syllabusChunks.length === 0) {
      setAlertMsg('No syllabus chunks available. Please upload a PDF first.');
      setTimeout(() => setAlertMsg(null), 5000);
      return;
    }

    setGenerating(true);
    try {
      const requestBody = {
        chunks: syllabusChunks,
        clientApiKey: localStorage.getItem('inception_api_key') || ''
      };
      // Sanity-check: the chunks array must not be empty at send time
      if (!requestBody.chunks || requestBody.chunks.length === 0) {
        throw new Error('Chunks array is empty — aborting to prevent "no source text" failure.');
      }
      const response = await fetch(`/api/papers/${paperId}/generate-answers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Answer generation failed');
      setGeneratedPaper(data.paper);
      setSuccessMsg(`Answer key generated for ${data.paper.parts?.reduce((s, p) => s + (p.questionSets?.length || 0), 0) || 0} questions!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setAlertMsg(`Answer Generation Error: ${err.message}`);
      setTimeout(() => setAlertMsg(null), 5000);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('answer-key-export-content');
    if (!element) {
      alert('Please generate the answer key first.');
      return;
    }
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const marginLeft = 10;
      const marginTop = 10;
      const marginRight = 10;
      const marginBottom = 10;
      const usableWidth = pageWidth - marginLeft - marginRight;
      const usableHeight = pageHeight - marginTop - marginBottom;
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      if (imgHeight > usableHeight) {
        const scale = usableHeight / imgHeight;
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        pdf.addImage(imgData, 'PNG', marginLeft + (usableWidth - scaledWidth) / 2, marginTop, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(imgData, 'PNG', marginLeft, marginTop, imgWidth, imgHeight);
      }
      const code = selectedPaper?.subjectCode || 'ANSWER';
      pdf.save(`${code}_Answer_Key.pdf`);
    } catch (err) {
      console.error('Error generating answer key PDF:', err);
      alert('Could not export answer key PDF.\n\nError: ' + err.message);
    }
  };

  // Determine if the Generate button should be enabled
  const canGenerate = selectedPaper && syllabusChunks.length > 0 && !generating;

  // The paper to display answers from
  const displayPaper = generatedPaper || selectedPaper;

  return (
    <div className="dashboard-container">
      <Navbar currentPage={page} setPage={() => {}} />

      <div className="main-workspace">
        <div className="workspace-header">
          <div className="title-area">
            <h1>Answer Key Generator</h1>
            <p>Generate and export answer keys for saved question papers using syllabus content.</p>
          </div>
        </div>

        {/* Global notifications */}
        {alertMsg && (
          <div className="glass-card" style={{ borderColor: 'hsl(0, 72%, 51%)', backgroundColor: 'hsl(0, 72%, 98%)', color: 'hsl(0, 72%, 25%)', display: 'flex', gap: '0.75rem', padding: '1.25rem' }}>
            <AlertTriangle size={20} stroke="hsl(0, 72%, 51%)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontWeight: 700 }}>Action Required</h4>
              <p style={{ fontSize: '0.9rem', marginTop: '0.15rem' }}>{alertMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="glass-card" style={{ borderColor: '#22c55e', backgroundColor: '#f0fdf4', color: '#166534', display: 'flex', gap: '0.75rem', padding: '1.25rem' }}>
            <CheckCircle size={20} stroke="#22c55e" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontWeight: 700 }}>Success</h4>
              <p style={{ fontSize: '0.9rem', marginTop: '0.15rem' }}>{successMsg}</p>
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          {/* Left column: Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Paper Selector */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--primary-navy)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BookOpen size={18} />
                <span>1. Select Question Paper</span>
              </h3>
              <div className="form-group">
                <label>Saved Papers</label>
                {savedPapers.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No saved papers found. Generate a question paper first.
                  </p>
                ) : (
                  <select
                    value={selectedPaper ? (selectedPaper.paperId || selectedPaper.id) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const paper = savedPapers.find(p => (p.paperId || p.id) === val);
                      setSelectedPaper(paper || null);
                      setGeneratedPaper(null);
                    }}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                  >
                    <option value="">-- Select a paper --</option>
                    {savedPapers.map((p) => (
                      <option key={p.paperId || p.id} value={p.paperId || p.id}>
                        {p.subject || 'Untitled'} {p.subjectCode ? `(${p.subjectCode})` : ''} — {p.testNo || 'TEST'} — {p.maxMarks || '?'} marks
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {selectedPaper && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <FileText size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {selectedPaper.subject} — Semester {selectedPaper.semester} — {selectedPaper.parts?.length || 0} part(s), {selectedPaper.parts?.reduce((s, p) => s + (p.questionSets?.length || 0), 0) || 0} question set(s)
                </div>
              )}
            </div>

            {/* PDF Upload */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--primary-navy)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Upload size={18} />
                <span>2. Upload Syllabus PDF</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Upload the syllabus PDF for this paper. The system will extract reference text for answer generation.
              </p>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1rem', background: 'var(--bg-cream)' }}>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfUpload}
                  style={{ width: '100%', fontSize: '0.85rem', padding: '0.35rem' }}
                  disabled={uploading}
                />
                {uploading && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                    Extracting text from PDF...
                  </div>
                )}
                {syllabusChunks.length > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: '4px', color: '#22c55e' }} />
                    {syllabusChunks.length} topic(s) extracted from PDF
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <div className="glass-card" style={{ background: 'var(--primary-navy)', color: 'var(--text-light)', border: 'none', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>3. Generate Answer Key</h3>
              {!canGenerate && (
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
                  {!selectedPaper
                    ? 'Select a paper and upload a syllabus PDF to continue.'
                    : syllabusChunks.length === 0
                      ? 'Upload a syllabus PDF above to continue.'
                      : ''}
                </p>
              )}
              <button
                className="btn btn-accent"
                style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', opacity: canGenerate ? 1 : 0.5, cursor: canGenerate ? 'pointer' : 'not-allowed' }}
                disabled={!canGenerate}
                onClick={handleGenerate}
              >
                {generating ? (
                  <>
                    <RefreshCw size={18} className="spin-animation" />
                    <span>Generating Answer Key...</span>
                  </>
                ) : (
                  <>
                    <Layers size={18} />
                    <span>Generate Answer Key</span>
                  </>
                )}
              </button>
            </div>

            {/* Export Button (only when answers exist) */}
            {generatedPaper && generatedPaper.parts?.some(p => p.questionSets?.some(qs => qs.questions?.some(q => q.subParts?.some(sp => sp.answer)))) && (
              <div className="glass-card" style={{ textAlign: 'center' }}>
                <button className="btn btn-accent" style={{ width: '100%', padding: '0.75rem' }} onClick={handleExportPDF}>
                  <Download size={18} />
                  <span>Export Answer Key as PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Right column: Answer Key Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary-navy)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={18} />
                <span>Answer Key Output</span>
              </h3>

              {!generatedPaper ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                  <Layers size={48} style={{ strokeWidth: 1, marginBottom: '1rem', color: 'var(--border-color)' }} />
                  <p>Select a paper, upload a syllabus PDF, and generate the answer key to see results here.</p>
                </div>
              ) : (
                <div id="answer-key-export-content" style={{ textAlign: 'left' }}>
                  {(generatedPaper.parts || []).map((part, partIdx) => (
                    <div key={partIdx} style={{ marginBottom: '1.25rem', pageBreakInside: 'avoid' }}>
                      <h4 style={{ fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.5rem', fontSize: '1rem' }}>
                        {part.partTitle || `PART ${['A', 'B', 'C', 'D'][partIdx] || String.fromCharCode(65 + partIdx)}`}
                      </h4>
                      {part.questionSets?.map((qs, setIdx) => {
                        const q = qs.questions?.[0];
                        if (!q) return null;
                        const subParts = q.subParts || [];
                        return (
                          <div key={setIdx} style={{
                            marginBottom: '0.75rem', padding: '0.75rem',
                            background: '#f8f9fa', borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--primary-navy)' }}>
                              Q{q.qNo || (partIdx * 2 + setIdx + 1)}
                            </div>
                            {subParts.map((sp, spIdx) => (
                              <div key={spIdx} style={{ marginTop: spIdx > 0 ? '0.5rem' : 0, paddingLeft: '0.75rem' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                  {sp.label} {sp.text} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({sp.marks} marks)</span>
                                </div>
                                <div style={{
                                  marginTop: '0.25rem', padding: '0.5rem 0.75rem',
                                  background: '#fff', borderRadius: '4px',
                                  borderLeft: '3px solid var(--accent-gold)',
                                  fontSize: '0.88rem', lineHeight: '1.6',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  <span style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>Answer: </span>
                                  {sp.answer || <em style={{ color: '#adb5bd' }}>No answer generated.</em>}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {(!generatedPaper.parts || generatedPaper.parts.length === 0) && (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                      No parts found in this paper to display answers for.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}