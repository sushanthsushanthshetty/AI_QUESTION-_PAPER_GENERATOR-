import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  Settings,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  History,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Edit3,
  Save,
  Sparkles,
  Layers,
  Clock,
  Award,
  Eye,
  ArrowLeft,
  X,
  Copy,
  Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

// Educational quotes for immersive loader
const ACADEMIC_QUOTES = [
  "\"The beautiful thing about learning is that no one can take it away from you.\" — B.B. King",
  "\"Education is not the learning of facts, but the training of the mind to think.\" — Albert Einstein",
  "\"Real learning comes when the competitive spirit has ceased.\" — Jiddu Krishnamurti",
  "\"The mind is not a vessel to be filled, but a fire to be kindled.\" — Plutarch",
  "\"An investment in knowledge pays the best interest.\" — Benjamin Franklin",
  "\"The function of education is to teach one to think intensively and to think critically.\" — Martin Luther King Jr."
];

const COGNITIVE_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

// Helper to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('jwtToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [page, setPage] = useState('create'); // 'create', 'history', 'settings', 'editor'

  // App Config States
  const [subject, setSubject] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [semester, setSemester] = useState(6);
  const [testNo, setTestNo] = useState('I');          // I or II
  const [maxMarks, setMaxMarks] = useState(25);
  const [duration, setDuration] = useState(60);
  const [syllabus, setSyllabus] = useState('');

  // MVIT Institutional Parameters
  const [facultyName, setFacultyName] = useState('');
  const [courseBranch, setCourseBranch] = useState('MCA');
  const [subjectCategory, setSubjectCategory] = useState('PCC');  // PCC | IPCC
  const [numParts, setNumParts] = useState(2);
  const [questionsPerPart, setQuestionsPerPart] = useState(1);

  // Bloom's Taxonomy Breakdown
  const [bloom, setBloom] = useState({
    rememberUnderstand: 40,
    applyAnalyze: 40,
    evaluateCreate: 20
  });

  // App UI states
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [currentPaper, setCurrentPaper] = useState(null);
  const [savedPapers, setSavedPapers] = useState([]);
  const [clientApiKey, setClientApiKey] = useState('');
  const [serverApiKeyConfigured, setServerApiKeyConfigured] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [sections, setSections] = useState([]);

  // ─── Data helpers ───────────────────────────────────────────────
  useEffect(() => {
    fetchPapers();
    fetchConfigStatus();
    const storedKey = localStorage.getItem('inception_api_key');
    if (storedKey) setClientApiKey(storedKey);
  }, []);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setQuoteIndex((prev) => (prev + 1) % ACADEMIC_QUOTES.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const fetchPapers = async () => {
    try {
      const response = await fetch('/api/papers', { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) setSavedPapers(data.papers);
    } catch (err) { console.error('Error fetching history:', err); }
  };

  const fetchConfigStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      if (data.success) setServerApiKeyConfigured(data.apiKeyConfigured);
    } catch (err) { console.error('Error fetching config status:', err); }
  };

  const handleSaveApiKey = (key) => {
    setClientApiKey(key);
    localStorage.setItem('inception_api_key', key);
    setSuccessMsg('API Key saved successfully!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const savePaperToDb = async (paper) => {
    try {
      const response = await fetch('/api/save-paper', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ paper: paper || editPaper })
      });
      const data = await response.json();
      if (data.success) { fetchPapers(); setSuccessMsg('Paper saved successfully!'); setTimeout(() => setSuccessMsg(null), 3000); }
    } catch (err) { console.error('Error saving paper:', err); }
  };

  const openEditor = (paper) => {
    setEditPaper(JSON.parse(JSON.stringify(paper)));
    setPaperViewMode('edit');
    setPage('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calcPaperTotal = (paper) => {
    if (!paper || !paper.parts) return 0;
    return (paper.parts || []).reduce((sum, part) => {
      return sum + (part.questionSets || []).reduce((s2, set) => {
        return s2 + (set.questions || []).reduce((s3, q) => s3 + (q.subParts || []).reduce((s4, sp) => s4 + (parseInt(sp.marks) || 0), 0), 0);
      }, 0);
    }, 0);
  };

  // Legacy section helpers (preserved for backward compat with old saved papers)
  const addSection = () => {
    const newId = sections.length > 0 ? Math.max(...sections.map(s => s.id)) + 1 : 1;
    setSections([...sections, { id: newId, title: `Part ${String.fromCharCode(65 + sections.length)} — New Section`, count: 5, marksPer: 2, type: 'short' }]);
  };
  const removeSection = (id) => { setSections(sections.filter(s => s.id !== id)); };
  const updateSection = (id, field, value) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: field === 'count' || field === 'marksPer' ? parseInt(value) || 0 : value } : s));
  };

  // In-place editing states
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editForm, setEditForm] = useState({ text: '', marks: 5, options: [] });
  const [regeneratingId, setRegeneratingId] = useState(null);

  // Editor view: editable working copy
  const [editPaper, setEditPaper] = useState(null);
  const [paperViewMode, setPaperViewMode] = useState('edit'); // 'edit' or 'preview'

  // Trigger main paper generation
  const generatePaper = async () => {
    setAlertMsg(null);
    setLoading(true);
    setLoadingProgress(10);

    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 8) + 2;
      });
    }, 1500);

    try {
      const payload = {
        subject,
        subjectCode,
        semester: parseInt(semester),
        testNo: `TEST PAPER - ${testNo}`,
        maxMarks: parseInt(maxMarks),
        duration: parseInt(duration),
        syllabus,
        bloomBreakdown: bloom,
        sections: sections.map(s => ({
          title: s.title, count: s.count, marksPer: s.marksPer, type: s.type
        })),
        clientApiKey,
        // MVIT-specific fields
        facultyName,
        courseBranch,
        subjectCategory,
        numParts: numParts,
        questionsPerPart: questionsPerPart
      };

      const response = await fetch('/api/generate-paper', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      clearInterval(progressInterval);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate question paper.');
      }

      setLoadingProgress(100);
      setTimeout(() => {
        setCurrentPaper(data.paper);
        setLoading(false);
        setLoadingProgress(0);
        savePaperToDb(data.paper);
        openEditor(data.paper);
      }, 500);

    } catch (err) {
      clearInterval(progressInterval);
      setLoading(false);
      setLoadingProgress(0);
      setAlertMsg(`Generation Failed: ${err.message}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Delete paper from history
  const deletePaper = async (id) => {
    try {
      const response = await fetch(`/api/papers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        fetchPapers();
        if (currentPaper && currentPaper.id === id) {
          setCurrentPaper(null);
        }
        if (editPaper && editPaper.id === id) {
          setEditPaper(null);
          setPage('history');
        }
      }
    } catch (err) {
      console.error('Error deleting paper:', err);
    }
  };

  // ===================== EDITOR FUNCTIONS =====================

  // Update paper metadata
  const updatePaperMeta = (field, value) => {
    setEditPaper(prev => ({ ...prev, [field]: value }));
  };

  // Add a new question to a section
  const addQuestion = (secIdx) => {
    const updated = { ...editPaper };
    const sec = updated.sections[secIdx];
    const newQ = {
      id: `q${sec.questions.length + 1}`,
      text: '',
      marks: sec.marksPerQuestion || 5,
      cognitiveLevel: 'Remember',
    };
    if (sec.sectionTitle?.toLowerCase().includes('mcq') || sec.sectionTitle?.toLowerCase().includes('multiple choice')) {
      newQ.options = ['', '', '', ''];
      newQ.correctAnswer = '';
    }
    sec.questions.push(newQ);
    setEditPaper(updated);
  };

  // Delete a question
  const deleteQuestion = (secIdx, qIdx) => {
    const updated = { ...editPaper };
    updated.sections[secIdx].questions.splice(qIdx, 1);
    setEditPaper(updated);
  };

  // Update a question field
  const updateQuestion = (secIdx, qIdx, field, value) => {
    const updated = { ...editPaper };
    updated.sections[secIdx].questions[qIdx][field] = value;
    setEditPaper(updated);
  };

  // Update an MCQ option
  const updateOption = (secIdx, qIdx, optIdx, value) => {
    const updated = { ...editPaper };
    const q = updated.sections[secIdx].questions[qIdx];
    if (!q.options) q.options = ['', '', '', ''];
    q.options[optIdx] = value;
    setEditPaper(updated);
  };

  // Move question up/down
  const moveQuestion = (secIdx, qIdx, direction) => {
    const updated = { ...editPaper };
    const questions = updated.sections[secIdx].questions;
    const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    [questions[qIdx], questions[targetIdx]] = [questions[targetIdx], questions[qIdx]];
    setEditPaper(updated);
  };

  // Add a new section to paper
  const addPaperSection = () => {
    const updated = { ...editPaper };
    const secCount = updated.sections?.length || 0;
    const newSec = {
      sectionTitle: `Part ${String.fromCharCode(65 + secCount)} — New Section`,
      marksPerQuestion: 5,
      questions: []
    };
    if (!updated.sections) updated.sections = [];
    updated.sections.push(newSec);
    setEditPaper(updated);
  };

  // Delete a section from paper
  const deletePaperSection = (secIdx) => {
    const updated = { ...editPaper };
    updated.sections.splice(secIdx, 1);
    setEditPaper(updated);
  };

  // Update a paper section title or marks per question
  const updatePaperSection = (secIdx, field, value) => {
    const updated = { ...editPaper };
    updated.sections[secIdx][field] = value;
    setEditPaper(updated);
  };

  // Save editor paper
  const saveEditorPaper = () => {
    savePaperToDb(editPaper);
    setCurrentPaper(editPaper);
  };

  // Single Question Editing (for inline edit in preview)
  const startEditQuestion = (secIdx, qIdx, q) => {
    setEditingQuestionId(`${secIdx}-${qIdx}`);
    setEditForm({
      text: q.text,
      marks: q.marks,
      options: q.options ? [...q.options] : []
    });
  };

  const saveEditQuestion = (secIdx, qIdx) => {
    const updatedSections = [...currentPaper.sections];
    const q = updatedSections[secIdx].questions[qIdx];
    q.text = editForm.text;
    q.marks = parseInt(editForm.marks) || q.marks;
    if (q.options) {
      q.options = editForm.options;
    }
    const updatedPaper = { ...currentPaper, sections: updatedSections };
    setCurrentPaper(updatedPaper);
    setEditingQuestionId(null);
    savePaperToDb(updatedPaper);
  };

  // Single Question AI Regeneration
  const regenerateQuestion = async (secIdx, qIdx, q) => {
    const qId = `${secIdx}-${qIdx}`;
    setRegeneratingId(qId);
    try {
      const response = await fetch('/api/regenerate-question', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          syllabus,
          questionText: q.text,
          cognitiveLevel: q.cognitiveLevel,
          marks: q.marks,
          type: q.options ? 'mcq' : 'subjective',
          options: q.options,
          clientApiKey
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      const newQ = data.question;
      const updatedSections = [...currentPaper.sections];
      updatedSections[secIdx].questions[qIdx] = {
        ...q,
        text: newQ.text,
        options: newQ.options || q.options,
        correctAnswer: newQ.correctAnswer || q.correctAnswer,
        cognitiveLevel: newQ.cognitiveLevel || q.cognitiveLevel
      };
      const updatedPaper = { ...currentPaper, sections: updatedSections };
      setCurrentPaper(updatedPaper);
      savePaperToDb(updatedPaper);
      setRegeneratingId(null);
    } catch (err) {
      console.error('Failed to regenerate single question:', err);
      alert(`Could not connect to generator: ${err.message}. Showing simulated replacement.`);
      const simulatedReplacements = [
        "Explain the difference between L1 and L2 regularization methods.",
        "Draw and explain the confusion matrix metrics for evaluation.",
        "Outline how backpropagation adjusts weights in a deep multi-layer neural network.",
        "Discuss the curse of dimensionality and how PCA addresses it.",
        "Calculate the entropy and information gain for a decision node with split [9+, 5-]."
      ];
      const randText = simulatedReplacements[Math.floor(Math.random() * simulatedReplacements.length)];
      const updatedSections = [...currentPaper.sections];
      updatedSections[secIdx].questions[qIdx] = { ...q, text: randText };
      const updatedPaper = { ...currentPaper, sections: updatedSections };
      setCurrentPaper(updatedPaper);
      savePaperToDb(updatedPaper);
      setRegeneratingId(null);
    }
  };

  // Export Paper to standard A4 PDF
  const exportPDF = async () => {
    // If we're in edit mode, switch to preview mode first
    if (paperViewMode === 'edit') {
      setPaperViewMode('preview');
      // Wait for React to re-render with the preview element
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const element = document.getElementById('paper-preview');
    if (!element) {
      alert('Please switch to Preview mode first to export the PDF.');
      return;
    }

    const actionBubbles = document.querySelectorAll('.question-actions-bubble');
    actionBubbles.forEach(b => b.style.display = 'none');

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const paperTitle = editPaper || currentPaper;
      const code = paperTitle?.subjectCode || subjectCode;
      const test = paperTitle?.testNo || testNo;
      pdf.save(`${code}_${test.replace(/\s+/g, '_')}_Paper.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Could not export PDF. Please verify browser capabilities.\n\nError: ' + err.message);
    } finally {
      actionBubbles.forEach(b => b.style.display = 'flex');
    }
  };

  // SVG Cognitive Levels Breakdown Pie Chart
  const renderBloomChart = () => {
    const total = bloom.rememberUnderstand + bloom.applyAnalyze + bloom.evaluateCreate;
    if (total === 0) return null;
    const rPerc = (bloom.rememberUnderstand / total) * 100;
    const aPerc = (bloom.applyAnalyze / total) * 100;
    const rRadius = 40;
    const circ = 2 * Math.PI * rRadius;
    const rStroke = (rPerc / 100) * circ;
    const aStroke = (aPerc / 100) * circ;
    const eStroke = circ - rStroke - aStroke;

    return (
      <div className="chart-container">
        <svg width="150" height="150" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={rRadius} fill="transparent" stroke="var(--border-color)" strokeWidth="12" />
          <circle cx="50" cy="50" r={rRadius} fill="transparent" stroke="var(--secondary-navy)" strokeWidth="12" strokeDasharray={`${rStroke} ${circ}`} strokeDashoffset="0" transform="rotate(-90 50 50)" />
          <circle cx="50" cy="50" r={rRadius} fill="transparent" stroke="var(--accent-gold)" strokeWidth="12" strokeDasharray={`${aStroke} ${circ}`} strokeDashoffset={`-${rStroke}`} transform="rotate(-90 50 50)" />
          <circle cx="50" cy="50" r={rRadius} fill="transparent" stroke="var(--navy-light)" strokeWidth="12" strokeDasharray={`${eStroke} ${circ}`} strokeDashoffset={`-${rStroke + aStroke}`} transform="rotate(-90 50 50)" />
          <text x="50" y="55" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--primary-navy)">AI</text>
        </svg>
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: 'var(--secondary-navy)' }} />
            <span>Remember/Understand ({Math.round(rPerc)}%)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: 'var(--accent-gold)' }} />
            <span>Apply/Analyze ({Math.round(aPerc)}%)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: 'var(--navy-light)' }} />
            <span>Evaluate/Create ({Math.round(100 - rPerc - aPerc)}%)</span>
          </div>
        </div>
      </div>

    )
  }

  // ─── MVIT Editor Helpers ────────────────────────────────────────

  // Immutable-update helpers for nested parts[] structure
  const _replaceQuestionsInSet = (paper, partIdx, setIdx, newQs) => {
    const parts = paper.parts.map((p, pi) =>
      pi === partIdx ? {...p, questionSets: p.questionSets.map((qs, si) => si === setIdx ? {...qs, questions: newQs } : qs) } : p
      );
      return {...paper, parts};
  };
  const _replacePart = (paper, partIdx, newPart) => {
    const parts = paper.parts.map((p, pi) => pi === partIdx ? newPart : p);
      return {...paper, parts};
  };

  const _updateSubPart = (partIdx, setIdx, qIdx, spIdx, field, value) => {
    const newPart = {...editPaper.parts[partIdx]};
    newPart.questionSets = newPart.questionSets.map((qs, si) =>
      si === setIdx
      ? {...qs, questions: qs.questions.map((q, qi) => qi === qIdx ? {...q, subParts: q.subParts.map((sp, spi) => spi === spIdx ? {...sp, [field]: field === 'marks' ? (parseInt(value) || 0) : value } : sp) } : q) }
      : qs
      );
      setEditPaper({...editPaper, parts: editPaper.parts.map((p, pi) => pi === partIdx ? newPart : p) });
  };

  const _updateQuestionMeta = (partIdx, setIdx, qIdx, field, value) => {
    const newPart = {...editPaper.parts[partIdx]};
    newPart.questionSets = newPart.questionSets.map((qs, si) =>
      si === setIdx ? {...qs, questions: qs.questions.map((q, qi) => qi === qIdx ? {...q, [field]: value } : q) } : qs
      );
      setEditPaper({...editPaper, parts: editPaper.parts.map((p, pi) => pi === partIdx ? newPart : p) });
  };

  const renderMVITPartEditor = (partIdx, part, editPaper, setEditPaper) => {
    const partNo    = part.partNo  || partIdx + 1;
      const partTitle = part.partTitle || `Part ${['A', 'B', 'C', 'D'][partIdx] || String.fromCharCode(65 + partIdx)}`;
      const letter    = ['A','B','C','D'][partIdx] || String.fromCharCode(65 + partIdx);
      return (
      <div className="glass-card" key={partIdx}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--accent-gold)', fontWeight: 800, margin: 0 }}>{partTitle}</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Mark weight per Q (auto from total): {editPaper.maxMarks} / {part.questionSets?.length || 0} questions heard
          </span>
        </div>
        {part.questionSets?.map((qs, setIdx) => {
          const q = qs.questions?.[0];
          if (!q) return null;
          const totalQ = (q.subParts || []).reduce((s, sp) => s + (sp.marks || 0), 0);
          const isLastSet = setIdx === (part.questionSets?.length || 1) - 1;
          return (
            <div key={setIdx} style={{ marginBottom: isLastSet ? 0 : '0.75rem' }}>
              <div
                className="editor-question-card"
                style={{
                  border: '2px solid var(--primary-navy)',
                  borderRadius: '8px', padding: '1rem', background: 'var(--bg-cream)',
                  marginBottom: isLastSet ? 0 : '0.5rem'
                }}
              >
                {/* Question header row: number + marks + CO/BL/PO/PI */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-navy)' }}>
                    Q{partIdx * 2 + setIdx + 1}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ margin: 0, width: '70px' }}>
                      <label style={{ fontSize: '0.6rem' }}>Total</label>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{totalQ} m</span>
                    </div>
                    <div className="form-group" style={{ margin: 0, width: '70px' }}>
                      <label style={{ fontSize: '0.6rem' }}>CO</label>
                      <select
                        value={q.co || `CO${partNo}`}
                        onChange={(e) => _updateQuestionMeta(partIdx, setIdx, 0, 'co', e.target.value)}
                        style={{ padding: '2px 4px', fontSize: '0.8rem' }}
                      >
                        {['CO1', 'CO2', 'CO3', 'CO4'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, width: '70px' }}>
                      <label style={{ fontSize: '0.6rem' }}>BL</label>
                      <select
                        value={q.bl || 'L2'}
                        onChange={(e) => _updateQuestionMeta(partIdx, setIdx, 0, 'bl', e.target.value)}
                        style={{ padding: '2px 4px', fontSize: '0.8rem' }}
                      >
                        {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, width: '70px' }}>
                      <label style={{ fontSize: '0.6rem' }}>PO</label>
                      <select
                        value={q.po || 'PO1'}
                        onChange={(e) => _updateQuestionMeta(partIdx, setIdx, 0, 'po', e.target.value)}
                        style={{ padding: '2px 4px', fontSize: '0.8rem' }}
                      >
                        {['PO1', 'PO2', 'PO3', 'PO4'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, width: '80px' }}>
                      <label style={{ fontSize: '0.6rem' }}>PI</label>
                      <input
                        type="text"
                        value={q.pi || ''}
                        onChange={(e) => _updateQuestionMeta(partIdx, setIdx, 0, 'pi', e.target.value)}
                        placeholder="1.7.1"
                        style={{ padding: '2px 4px', fontSize: '0.8rem', width: '80px' }}
                      />
                    </div>
                  </div>
                </div>
                {/* Sub-parts */}
                {(q.subParts || []).map((sp, spIdx) => (
                  <div key={spIdx} style={{
                    display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                    paddingTop: spIdx > 0 ? '0.5rem' : 0,
                    borderTop: spIdx > 0 ? '1px dashed var(--border-color)' : 'none'
                  }}>
                    <span style={{
                      fontWeight: 700, color: 'var(--primary-navy)', minWidth: '30px',
                      paddingTop: '7px', fontSize: '0.85rem', flexShrink: 0
                    }}>
                      {sp.label}
                    </span>
                    <textarea
                      rows={2}
                      value={sp.text || ''}
                      onChange={(e) => _updateSubPart(partIdx, setIdx, 0, spIdx, 'text', e.target.value)}
                      style={{ flex: 1, fontSize: '0.9rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: '#fff' }}
                      placeholder="Enter sub-question text…"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                      <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>mks</label>
                      <input
                        type="number"
                        value={sp.marks || 0}
                        min={0}
                        onChange={(e) => _updateSubPart(partIdx, setIdx, 0, spIdx, 'marks', e.target.value)}
                        style={{ width: '48px', textAlign: 'center', padding: '3px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {!isLastSet && (
                <div style={{
                  textAlign: 'center', fontWeight: 800, fontSize: '1.05rem',
                  color: 'var(--primary-navy)', letterSpacing: '2px', padding: '2px 0'
                }}>
                  OR
                </div>
              )}
            </div>
          );
        })}
      </div>
      );
  };

  const renderLegacySectionEditor = (secIdx, sec, editPaper, setEditPaper) => (
      <div className="glass-card" key={secIdx}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
          (Legacy Section — {sec.sectionTitle})
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Re-generate from the Create page to get a fresh MVIT-format paper.
        </p>
      </div>
      );

return (
  <div className="dashboard-container">
    {/* IMMERSIVE AI GENERATING LOADER OVERLAY */}
    {loading && (
      <div className="loader-overlay">
        <div className="loader-book">
          <div className="loader-book-spine"></div>
          <div className="loader-book-page left"></div>
          <div className="loader-book-page right flipping"></div>
        </div>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, color: 'var(--text-light)', letterSpacing: '0.5px' }}>
          COGNITIVE SYLLABUS SCANNER
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Structuring questions based on Bloom's Taxonomy...
        </p>
        <div className="loader-progress">
          <div className="loader-progress-bar" style={{ width: `${loadingProgress}%` }}></div>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
          Analyzing and aligning text content ({loadingProgress}%)
        </p>
        <div className="academic-quotes">
          {ACADEMIC_QUOTES[quoteIndex]}
        </div>
      </div>
    )}

    {/* NAVBAR SIDEBAR */}
    <Navbar currentPage={page} setPage={setPage} />

    {/* MAIN WORKSPACE */}
    <div className="main-workspace">
      {/* Workspace Header */}
      <div className="workspace-header">
        <div className="title-area">
          {page === 'create' && (
            <>
              <h1>AI Paper Compiler</h1>
              <p>Compile professional question papers by syllabus content using advanced cognitive metrics.</p>
            </>
          )}
          {page === 'editor' && (
            <>
              <h1>Paper Editor</h1>
              <p>Edit questions, marks, metadata, and review the generated question paper.</p>
            </>
          )}
          {page === 'history' && (
            <>
              <h1>Saved Question Papers</h1>
              <p>Review, edit, or print previously compiled university exam sheets.</p>
            </>
          )}
          {page === 'settings' && (
            <>
              <h1>AI Configurations & Keys</h1>
              <p>Configure model specifications, API keys, and server options.</p>
            </>
          )}
        </div>
        {page === 'editor' && editPaper && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className={`btn ${paperViewMode === 'edit' ? 'btn-accent' : 'btn-outline'}`} onClick={() => setPaperViewMode('edit')}>
              <Edit3 size={16} />
              <span>Edit</span>
            </button>
            <button className={`btn ${paperViewMode === 'preview' ? 'btn-accent' : 'btn-outline'}`} onClick={() => setPaperViewMode('preview')}>
              <Eye size={16} />
              <span>Preview</span>
            </button>
            <button className="btn btn-accent" onClick={exportPDF}>
              <Download size={18} />
              <span>Export PDF</span>
            </button>
            <button className="btn btn-primary" onClick={saveEditorPaper}>
              <Save size={16} />
              <span>Save</span>
            </button>
          </div>
        )}
        {page === 'create' && currentPaper && (
          <button className="btn btn-accent" onClick={() => openEditor(currentPaper)}>
            <Edit3 size={18} />
            <span>Open in Editor</span>
          </button>
        )}
      </div>

      {/* Global Warnings / Notifications */}
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

      {/* ==================== EDITOR VIEW ==================== */}
      {page === 'editor' && editPaper && (
        <div className="editor-container">
          {paperViewMode === 'edit' ? (
            /* ===== EDIT MODE ===== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Paper Metadata */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--primary-navy)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={18} />
                  <span>Paper Metadata</span>
                </h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Subject Name</label>
                    <input type="text" value={editPaper.subject || ''} onChange={(e) => updatePaperMeta('subject', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Subject Code</label>
                    <input type="text" value={editPaper.subjectCode || ''} onChange={(e) => updatePaperMeta('subjectCode', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Semester</label>
                    <input type="number" value={editPaper.semester || ''} onChange={(e) => updatePaperMeta('semester', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>Course/Branch</label>
                    <input type="text" value={editPaper.courseBranch || editPaper.semesterBranch || 'MCA'} onChange={(e) => updatePaperMeta('courseBranch', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Faculty Name</label>
                    <input type="text" value={editPaper.facultyName || ''} onChange={(e) => updatePaperMeta('facultyName', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Subject Category</label>
                    <select value={editPaper.subjectCategory || 'PCC'} onChange={(e) => updatePaperMeta('subjectCategory', e.target.value)}>
                      <option value="PCC">PCC</option>
                      <option value="IPCC">IPCC</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Test Number</label>
                    <select value={editPaper.testNo ? String(editPaper.testNo).replace('TEST PAPER - ', '') : 'I'} onChange={(e) => updatePaperMeta('testNo', `TEST PAPER - ${e.target.value}`)}>
                      <option value="TEST PAPER - I">I</option>
                      <option value="TEST PAPER - II">II</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Max Marks</label>
                    <input type="number" value={editPaper.maxMarks || ''} onChange={(e) => updatePaperMeta('maxMarks', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>Duration (min)</label>
                    <input type="number" value={editPaper.duration || ''} onChange={(e) => updatePaperMeta('duration', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              {/* Parts & Questions (MVIT format) */}
              {(editPaper.parts || editPaper.sections) && (editPaper.parts || editPaper.sections).map((partOrSec, partIdx) => {
                const part = partOrSec;
                // Back-compat: support both legacy sections[] and new parts[]
                const isMVITPart = !!part.questionSets;
                const parts = editPaper.parts ? editPaper.parts.map(p => ({
                  partNo: p.partNo,
                  sectionTitle: p.partTitle || `Part ${String.fromCharCode(65 + (p.partNo || 1) - 1)}`,
                  questionSets: (p.questionSets || []).map((qs, i) => ({
                    ...qs,
                    questions: (qs.questions || []).map(q => ({
                      ...q,
                      subParts: q.subParts || [{ label: 'a)', text: q.text || '', marks: q.marks || 0 }],
                      marks: q.subParts ? q.subParts.reduce((s, sp) => s + (sp.marks || 0), 0) : (q.marks || 0),
                    }))
                  }))
                })) : null;

                return isMVITPart
                  ? renderMVITPartEditor(partIdx, part, editPaper, setEditPaper)
                  : null;
              }) || (
                  editPaper.sections && editPaper.sections.map((sec, secIdx) => renderLegacySectionEditor(secIdx, sec, editPaper, setEditPaper))
                )}

              <button className="btn btn-accent" style={{ width: '100%', padding: '0.75rem' }} onClick={addPaperSection}>
                <Plus size={16} />
                <span>Add Section</span>
              </button>

              {/* Marks Summary */}
              <div className="glass-card" style={{ background: 'var(--primary-navy)', color: 'var(--text-light)', border: 'none' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>Marks Summary</h3>
                <p style={{ fontSize: '0.9rem' }}>
                  Total: <strong style={{ color: 'var(--accent-gold)', fontSize: '1.2rem' }}>{calcPaperTotal(editPaper)}</strong> / {editPaper.maxMarks || 0} marks
                </p>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
                  {calcPaperTotal(editPaper) === (editPaper.maxMarks || 0)
                    ? '✓ Marks are balanced'
                    : `⚠ Marks mismatch by ${Math.abs((editPaper.maxMarks || 0) - calcPaperTotal(editPaper))}`}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={saveEditorPaper}>
                  <Save size={16} />
                  <span>Save Changes</span>
                </button>
                <button className="btn btn-accent" onClick={exportPDF}>
                  <Download size={16} />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
          ) : (
              /* ===== PREVIEW MODE ===== */
              <div>
                <div className="glass-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                  <div className="paper-container" style={{ margin: '0 auto' }}>
                    <div className="printable-paper" id="paper-preview">
                      <div className="paper-header">
                        <h2 className="paper-univ-title">SIR M. VISVESVARAYA INSTITUTE OF TECHNOLOGY</h2>
                        <h3 className="paper-test-title">DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING</h3>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0.25rem 0' }}>
                          {(editPaper.testNo || '').toUpperCase()} — MAY 2026
                        </div>
                        <div className="paper-meta-grid">
                          <div className="paper-meta-item"><strong>Course Name:</strong> {editPaper.subject}</div>
                          <div className="paper-meta-item"><strong>Course Code:</strong> {editPaper.subjectCode}</div>
                          <div className="paper-meta-item"><strong>Semester / Branch:</strong> Semester {editPaper.semester} / CSE</div>
                          <div className="paper-meta-item" style={{ display: 'flex', gap: '2rem' }}>
                            <span><strong>Duration:</strong> {editPaper.duration} Min</span>
                            <span><strong>Max Marks:</strong> {editPaper.maxMarks}</span>
                          </div>
                        </div>
                      </div>
                      <div className="paper-instructions">
                        <h4>General Instructions:</h4>
                        <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                          <li>Answer all sections completely. All questions in a section carry equal weight.</li>
                          <li>Write legibly and represent answers with diagrams or flowcharts wherever appropriate.</li>
                          <li>Use of programmable calculators or communication equipment is strictly prohibited.</li>
                        </ol>
                      </div>
                      {editPaper.sections && editPaper.sections.map((sec, secIdx) => (
                        <div className="paper-section" key={secIdx}>
                          <h3 className="paper-section-title">
                            {sec.sectionTitle} ({sec.questions?.length || 0} x {sec.marksPerQuestion} = {(sec.questions?.length || 0) * (sec.marksPerQuestion || 0)} Marks)
                          </h3>
                          {sec.questions && sec.questions.map((q, qIdx) => (
                            <div className="paper-question-wrapper" key={qIdx}>
                              <div className="question-text-row">
                                <span className="question-num">{qIdx + 1}.</span>
                                <span className="question-text">{q.text}</span>
                                <span className="question-marks">[{q.marks}]</span>
                              </div>
                              {q.options && q.options.length > 0 && q.options.some(o => o) && (
                                <div className="question-options-grid">
                                  {q.options.map((opt, oIdx) => (
                                    opt ? (
                                      <div className="option-item" key={oIdx}>
                                        <span className="option-letter">({String.fromCharCode(65 + oIdx)})</span>
                                        <span>{opt}</span>
                                      </div>
                                    ) : null
                                  ))}
                                </div>
                              )}
                              <div className="question-meta-tags">
                                <span>CO: CO{secIdx + 1}</span>
                                <span>Level: {q.cognitiveLevel}</span>
                                {q.correctAnswer && <span style={{ color: 'var(--accent-gold)' }}>Ans: {q.correctAnswer}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div style={{ marginTop: 'auto', paddingTop: '3rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                        <div style={{ textDecoration: 'overline', fontWeight: 600 }}>Course Coordinator</div>
                        <div style={{ textDecoration: 'overline', fontWeight: 600 }}>Module Coordinator</div>
                        <div style={{ textDecoration: 'overline', fontWeight: 600 }}>Head of Department</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        </div>
      )}

      {/* ==================== CREATE VIEW ==================== */}
      {page === 'create' && (
        <div className="dashboard-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--primary-navy)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={18} />
                <span>1. Institutional Parameters</span>
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Course Title</label>
                  <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Machine Learning" />
                </div>
                <div className="form-group">
                  <label>Course Code</label>
                  <input type="text" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="e.g. 21CS61" />
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Evaluation Cycle</label>
                  <input type="text" value={testNo} onChange={(e) => setTestNo(e.target.value)} placeholder="e.g. Internal Assessment I" />
                </div>
                <div className="form-group">
                  <label>Maximum Marks</label>
                  <input type="number" value={maxMarks} onChange={(e) => setMaxMarks(parseInt(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label>Duration (Minutes)</label>
                  <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="form-group full-width" style={{ marginTop: '1.25rem' }}>
                <label>Syllabus Content / Topics Blueprint</label>
                <textarea rows={4} value={syllabus} onChange={(e) => setSyllabus(e.target.value)} placeholder="Enter course modules, concepts or copy syllabus texts here to train the AI on specific topics..." />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--primary-navy)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Award size={18} />
                <span>3. Cognitive Distribution</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Balance question complexity mapping based on university cognitive models (Bloom's Taxonomy).
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="slider-group">
                  <div className="slider-header">
                    <span>Remember / Understand</span>
                    <span className="slider-val">{bloom.rememberUnderstand}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={bloom.rememberUnderstand} onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const diff = 100 - val;
                    setBloom({ rememberUnderstand: val, applyAnalyze: Math.round(diff * 0.6), evaluateCreate: Math.round(diff * 0.4) });
                  }} />
                </div>
                <div className="slider-group">
                  <div className="slider-header">
                    <span>Apply / Analyze</span>
                    <span className="slider-val">{bloom.applyAnalyze}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={bloom.applyAnalyze} onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const diff = 100 - val;
                    setBloom({ rememberUnderstand: Math.round(diff * 0.5), applyAnalyze: val, evaluateCreate: Math.round(diff * 0.5) });
                  }} />
                </div>
                <div className="slider-group">
                  <div className="slider-header">
                    <span>Evaluate / Create</span>
                    <span className="slider-val">{bloom.evaluateCreate}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={bloom.evaluateCreate} onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const diff = 100 - val;
                    setBloom({ rememberUnderstand: Math.round(diff * 0.6), applyAnalyze: Math.round(diff * 0.4), evaluateCreate: val });
                  }} />
                </div>
              </div>
              <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                {renderBloomChart()}
              </div>
            </div>

            <div className="glass-card" style={{ background: 'var(--primary-navy)', color: 'var(--text-light)', border: 'none', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>Ready to Compile?</h3>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem' }}>
                The model will analyze the syllabus modules, check marks balance, and write an academic paper in seconds.
              </p>
              <button className="btn btn-accent" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }} onClick={generatePaper}>
                <Sparkles size={18} />
                <span>Generate Question Paper</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== HISTORY VIEW ==================== */}
      {page === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--primary-navy)', fontWeight: 700 }}>
              📜 Saved Question Papers Archive
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Access and manage all previously generated university exam sheets.
            </p>

            {savedPapers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                <BookOpen size={48} style={{ strokeWidth: 1, marginBottom: '1rem', color: 'var(--border-color)' }} />
                <p>No saved question papers found. Compile a new paper to get started!</p>
              </div>
            ) : (
              <div className="history-list">
                {savedPapers.map((paper) => (
                  <div className="history-item" key={paper.id}>
                    <div className="history-info">
                      <h4>{paper.subject || 'Syllabus Paper'} {paper.subjectCode ? `(${paper.subjectCode})` : ''}</h4>
                      <p>
                        Semester {paper.semester} &bull; {paper.testNo || 'TEST PAPER - I'} &bull; {paper.maxMarks} Marks &bull; {paper.duration} Min
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button className="btn btn-accent" onClick={() => openEditor(paper)}>
                        <Edit3 size={14} />
                        <span>Open</span>
                      </button>
                      <button className="btn btn-outline" onClick={() => {
                        setCurrentPaper(paper);
                        openEditor(paper);
                        setPaperViewMode('preview');
                      }}>
                        <Eye size={14} />
                        <span>Preview</span>
                      </button>
                      <button className="btn btn-danger" onClick={() => deletePaper(paper.id)} style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== SETTINGS VIEW ==================== */}
      {page === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--primary-navy)', fontWeight: 700 }}>
              🔑 Inception AI API Key Setup
            </h3>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Inception API Key</label>
              <input type="password" value={clientApiKey} onChange={(e) => setClientApiKey(e.target.value)} placeholder="Enter your api key starting with bearer token or standard format..." />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                If configured, this key overrides the INCEPTION_API_KEY value specified in the root `.env` file. It is saved in your local browser session safely.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={() => handleSaveApiKey(clientApiKey)}>Save Settings</button>
              <button className="btn btn-outline" onClick={() => { localStorage.removeItem('inception_api_key'); setClientApiKey(''); setSuccessMsg('Session key cleared!'); setTimeout(() => setSuccessMsg(null), 3000); }}>
                Clear Key
              </button>
            </div>
          </div>
          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary-navy)', fontWeight: 700 }}>
              ⚙️ Model & Prompt Parameters
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Default settings mapped for AI communications.</p>
            <div className="form-grid">
              <div className="form-group">
                <label>Primary Inception Model</label>
                <input type="text" value="mercury-2" disabled style={{ backgroundColor: 'var(--bg-cream)', cursor: 'not-allowed' }} />
              </div>
              <div className="form-group">
                <label>API Endpoint</label>
                <input type="text" value="https://api.inceptionlabs.ai/v1" disabled style={{ backgroundColor: 'var(--bg-cream)', cursor: 'not-allowed' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Hidden MVIT Preview for PDF export */}
    <div style={{ display: 'none' }}>
      {currentPaper && <MVITPaperPreview paper={currentPaper} />}
    </div>
  </div>
);
}

// ─── MVIT Preview Renderer ──────────────────────────────────────
const todayDate = new Date().toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric' });

const colHdrStyle = {
  background:'#1a3560', color:'#fff',
  fontWeight:700, padding:'3px 4px', fontSize:'8.5pt',
  border:'1px solid #000', textAlign:'center', whiteSpace:'nowrap'
};
const cellStyle = {
  border:'1px solid #000', padding:'3px 4px', fontSize:'8.5pt',
  verticalAlign:'top', textAlign:'center'
};
const cellQ = {...cellStyle, textAlign:'left', verticalAlign:'top' };

const MVITPaperPreview = ({paper: p }) => {
  const br   = p.courseBranch    || 'MCA';
  const sc   = p.subjectCode    || '';
  const sg   = p.subjectCategory || 'PCC';
  const codeBoxes = sc ? `
  <span style="display: inline-block; width: 22px; height: 20px; border: 1.5px solid #000; text-align: center; line-height: 20px; font-size: 10pt; margin: 0 1px;">${sc[0] || ''}</span>
  <span style="display: inline-block; width: 22px; height: 20px; border: 1.5px solid #000; text-align: center; line-height: 20px; font-size: 10pt; margin: 0 1px;">${sc[1] || ''}</span>
  <span style="display: inline-block; width: 22px; height: 20px; border: 1.5px solid #000; text-align: center; line-height: 20px; font-size: 10pt; margin: 0 1px;">${sc[2] || ''}</span>
  <span style="display: inline-block; width: 22px; height: 20px; border: 1.5px solid #000; text-align: center; line-height: 20px; font-size: 10pt; margin: 0 1px;">${sc[3] || ''}</span>` : '';

  return (
    <div style={{ padding: '8mm 6mm 6mm 6mm', width: '100%', boxSizing: 'border-box' }}>

      {/* ── ❶ HEADER ─────────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
        <colgroup>
          <col style={{ width: '35%' }} />
          <col style={{ width: '30%', textAlign: 'center', verticalAlign: 'middle' }} />
          <col style={{ width: '35%', textAlign: 'right' }} />
        </colgroup>
        <tr>
          <td style={{ fontSize: '12pt', fontWeight: 700, color: '#c0392b' }}>{todayDate}</td>
          <td style={{
            textAlign: 'center', fontSize: '10pt', fontWeight: 700, color: '#888',
            fontStyle: 'italic', verticalAlign: 'middle'
          }}>
            (For faculty use only)
          </td>
          <td style={{ textAlign: 'right', fontSize: '10pt', fontWeight: 700 }} dangerouslySetInnerHTML={{ __html: sc + codeBoxes }}>
          </td>
        </tr>
      </table>

      {/* Logo + USN strip */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3px' }}>
        <colgroup>
          <col style={{ width: '80px' }} />
          <col style={{ width: '1px' }} />
          <col style={{ width: '2px' }} />
          <col />
        </colgroup>
        <tr>
          <td style={{ width: '70px', height: '38px', border: '1.5px solid #000', background: '#f8f8f8', textAlign: 'center', fontSize: '6pt', color: '#888', padding: '2px', verticalAlign: 'middle' }}>
            (SVIT Logo)
          </td>
          <td style={{
            border: '1.5px solid #000', borderLeft: 'none', background: '#f8f8f8',
            textAlign: 'center', fontSize: '8pt', padding: '3px 2px'
          }}>
            <span style={{ fontSize: '10pt', fontWeight: 700 }}>1</span> |
            <span style={{ fontSize: '10pt', fontWeight: 700, margin: '0 2px' }}>M</span> |
            <span style={{ fontSize: '10pt', fontWeight: 700 }}>V</span>
          </td>
          <td style={{ width: '4px', border: '1.5px solid #000', borderLeft: 'none' }}></td>
          <td style={{ border: '1.5px solid #000', borderLeft: 'none', padding: '0', height: '38px' }}>
            <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', padding: '3px' }}>
              <tr style={{ height: '50%' }}>
                <td style={{
                  fontFamily: 'monospace', fontSize: '13pt', letterSpacing: '1px',
                  borderBottom: '1px solid #aaa', padding: '2px 4px', color: '#555'
                }}>
                  USN: <span style={{ display: 'inline-block', width: '3px', borderTop: '2px solid #000' }}></span>
                  <span style={{ display: 'inline-block', width: '3px', borderTop: '2px solid #000' }}></span>
                  <span style={{ display: 'inline-block', width: '3px', borderTop: '2px solid #000' }}></span>
                </td>
              </tr>
              <tr style={{ height: '50%' }}>
                <td style={{ fontSize: '8pt', color: '#888', padding: '2px 4px' }}>
                  Subject Category: {sg} | Class &amp; Year
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      {/* College Name */}
      <h2 style={{
        margin: '0 0 2px 0', fontSize: '11pt', fontWeight: 700, textAlign: 'center',
        fontFamily: 'Times New Roman, serif', letterSpacing: '0.5px', lineHeight: '1.3'
      }}>
        Sir M. Visvesvaraya Institute of Technology, Bengaluru-562 157<br />
        <span style={{ fontSize: '9pt', fontWeight: 400, fontFamily: 'Arial, sans-serif' }}>
          (Affiliated to VTU, Approved by AICTE, Accredited by NAAC)
        </span>
      </h2>

      {/* ── ❷ TITLE LINE ───────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
        <tr>
          <td style={{
            borderTop: '1.5px solid #000', borderBottom: '1.5px solid #000',
            padding: '4px 8px', fontSize: '12pt', fontWeight: 800,
            textAlign: 'center', fontFamily: 'Times New Roman, serif', letterSpacing: '2px'
          }}>
            {(p.testNo || 'TEST PAPER - I').toUpperCase()}
          </td>
        </tr>
      </table>

      {/* ── ❸ INFO GRID (2-column) ─────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
        <colgroup>
          <col style={{ width: '52%' }} />
          <col style={{ width: '48%' }} />
        </colgroup>
        <tr>
          <td style={{ border: '1px solid #000', verticalAlign: 'top' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {[
                ['TEST NO', String(p.testNo || 'I').replace('TEST PAPER - ', '')],
                ['COURSE/BRANCH', br],
                ['SUBJECT', p.subject || ''],
              ].map(([lbl, val]) => (
                <tr key={lbl}>
                  <td style={{
                    fontWeight: 700, background: '#f5f5f5', border: '1px solid #000',
                    borderTop: 'none', borderLeft: 'none',
                    padding: '2px 6px', fontSize: '8.5pt', width: '38%'
                  }}>{lbl}</td>
                  <td style={{
                    border: '1px solid #000', borderTop: 'none',
                    padding: '2px 6px', fontSize: '8.5pt', fontWeight: 600
                  }}>{val}</td>
                </tr>
              ))}
            </table>
          </td>
          <td style={{ border: '1px solid #000', verticalAlign: 'top' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {[
                ['SEMESTER', p.semester ? `Semester ${p.semester}` : '—'],
                ['MAX. MARKS', p.maxMarks || 25],
                ['DURATION', `${p.duration || 60} minutes`],
                ['FACULTY NAME', p.facultyName || 'To be filled'],
              ].map(([lbl, val]) => (
                <tr key={lbl}>
                  <td style={{
                    fontWeight: 700, background: '#f5f5f5', border: '1px solid #000',
                    borderTop: 'none', borderRight: 'none',
                    padding: '2px 6px', fontSize: '8.5pt', width: '38%'
                  }}>{lbl}</td>
                  <td style={{
                    border: '1px solid #000', borderTop: 'none', borderRight: 'none',
                    padding: '2px 6px', fontSize: '8.5pt', fontWeight: 600
                  }}>{val}</td>
                </tr>
              ))}
            </table>
          </td>
        </tr>
      </table>

      {/* ── ❹ INSTRUCTIONS ─────────────────────────────────────── */}
      <div style={{
        borderTop: '1.5px solid #000', borderBottom: '1.5px solid #000',
        padding: '4px 8px', margin: '4px 0',
        fontSize: '8.5pt', fontWeight: 700, fontFamily: 'Times New Roman, serif'
      }}>
        Instructions: Answer any one Question from each Part
      </div>

      {/* ── ❺ BLOOM'S TAXONOMY NOTE ────────────────────────────── */}
      <div style={{
        fontSize: '7.5pt', lineHeight: '1.4', margin: '3px 0',
        fontFamily: 'Arial, sans-serif', color: '#222'
      }}>
        <span style={{ fontWeight: 700, textDecoration: 'underline' }}>BL</span> – Bloom's Taxonomy Levels (
        1-Remembering, 2-Understanding, 3–Applying, 4-Analyzing, 5-Evaluating, 6-Creating) &nbsp;&nbsp;
        <span style={{ fontWeight: 700, textDecoration: 'underline' }}>CO</span> – Course Outcomes &nbsp;&nbsp;
        <span style={{ fontWeight: 700, textDecoration: 'underline' }}>PO</span> – Program Outcomes; &nbsp;&nbsp;
        <span style={{ fontWeight: 700, textDecoration: 'underline' }}>PI</span> – Performance Indicator
      </div>

      {/* ── ❻ QUESTION TABLE ────────────────────────────────────── */}
      {(p.parts || []).map((part, partIdx) => {
        const letter = ['A', 'B', 'C', 'D'][partIdx] || String.fromCharCode(65 + partIdx);
        const isLast = partIdx === (p.parts?.length || 1) - 1;

        return (
          <div key={partIdx} style={{ marginBottom: isLast ? '6px' : '10px' }}>
            {/* Part Heading */}
            <div style={{
              background: '#1a3560', color: '#fff',
              fontWeight: 800, padding: '3px 6px', fontSize: '9.5pt',
              fontFamily: 'Arial, sans-serif', letterSpacing: '1px'
            }}>
              {part.partTitle || `PART ${letter}`}
            </div>

            {/* First question-set row (Set 1) */}
            {part.questionSets?.map((qs, setIdx) => {
              const q = qs.questions?.[0];
              if (!q) return null;
              const subParts = q.subParts || [];
              const isLastInPart = setIdx === (part.questionSets?.length || 1) - 1;

              return (
                <React.Fragment key={setIdx}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
                    <colgroup>
                      <col style={{ width: '6%' }} />     {/* Q.No */}
                      <col style={{ width: '6%' }} />     {/* Label/Marks */}
                      <col style={{ width: '6%' }} />     {/* Marks */}
                      <col style={{ width: '6%' }} />     {/* CO */}
                      <col style={{ width: '6%' }} />     {/* BL */}
                      <col style={{ width: '6%' }} />     {/* PO */}
                      <col style={{ width: '6%' }} />     {/* PI */}
                      <col />                             {/* Question text */}
                    </colgroup>
                    {/* Header row */}
                    <tr>
                      <th style={{ ...colHdrStyle, width: '6%' }}>Q.No</th>
                      <th style={{ ...colHdrStyle, width: '6%' }}>Sub</th>
                      <th style={{ ...colHdrStyle, width: '6%' }}>Marks</th>
                      <th style={{ ...colHdrStyle, width: '6%' }}>CO</th>
                      <th style={{ ...colHdrStyle, width: '6%' }}>BL</th>
                      <th style={{ ...colHdrStyle, width: '6%' }}>PO</th>
                      <th style={{ ...colHdrStyle, width: '6%' }}>PI</th>
                      <th style={{ ...colHdrStyle }}>Question</th>
                    </tr>
                    {/* Data rows for sub-parts */}
                    {subParts.map((sp, spIdx) => {
                      const isFirstSub = spIdx === 0;
                      const isSecondSub = !isFirstSub;
                      return (
                        <tr key={spIdx}>
                          {/* Q.No cell — merge first sub(rowspan=2) or blank */}
                          {isFirstSub ? (
                            <td rowSpan={subParts.length} style={{ ...cellStyle, fontWeight: 800, fontSize: '9.5pt', verticalAlign: 'middle', textAlign: 'center' }}>
                              {q.qNo || (partIdx * 2 + setIdx + 1)}
                            </td>
                          ) : null}
                          {/* Sub-part label */}
                          <td style={{ ...cellStyle, fontWeight: 600, background: '#eef2fb', textAlign: 'left', textIndent: '10px' }}>
                            {sp.label}
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 700, textAlign: 'center' }}>{sp.marks || ''}</td>
                          {/* CO/BL/PO/PI show in header of first sub-part only */}
                          <td style={{
                            ...cellStyle, color: '#666', backgroundColor: isFirstSub ? '#fff' : 'transparent',
                            borderTop: isSecondSub ? 'none' : undefined
                          }}>{isFirstSub ? (q.co || '') : ''}</td>
                          <td style={{
                            ...cellStyle, color: '#666', backgroundColor: isFirstSub ? '#fff' : 'transparent',
                            borderTop: isSecondSub ? 'none' : undefined
                          }}>{isFirstSub ? (q.bl || '') : ''}</td>
                          <td style={{
                            ...cellStyle, color: '#666', backgroundColor: isFirstSub ? '#fff' : 'transparent',
                            borderTop: isSecondSub ? 'none' : undefined
                          }}>{isFirstSub ? (q.po || '') : ''}</td>
                          <td style={{
                            ...cellStyle, color: '#666', backgroundColor: isFirstSub ? '#fff' : 'transparent',
                            borderTop: isSecondSub ? 'none' : undefined
                          }}>{isFirstSub ? (q.pi || '') : ''}</td>
                          <td style={{ ...cellQ, paddingLeft: '6px' }}>{sp.text || ''}</td>
                        </tr>
                      );
                    })}
                  </table>
                  {/* OR separator between sets */}
                  {!isLastInPart && (
                    <div style={{
                      textAlign: 'center', fontWeight: 800, fontSize: '10pt',
                      color: '#000', padding: '1px 0', letterSpacing: '3px'
                    }}>
                      ─── OR ───
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}

      {/* ── ❼ CO STATEMENTS FOOTER ──────────────────────────────── */}
      <div style={{ marginTop: '8px', borderTop: '2px solid #000', paddingTop: '5px' }}>
        <div style={{ fontWeight: 700, fontSize: '8pt', marginBottom: '3px' }}>CO Statements:</div>
        {(p.parts || []).flatMap((part) => part.questionSets || []).flatMap((qs) => qs.questions || [])
          .map((q, i) => q.co || `CO${i + 1}`)
          .filter((co, i, arr) => arr.indexOf(co) === i)
          .map((co, i) => (
            <div key={co + i} style={{ fontSize: '8pt', lineHeight: '1.4' }}>
              <strong>{co}:</strong> {co}
            </div>
          ))}
      </div>

      {/* ── ❽ VERIFIED / APPROVED FOOTER ───────────────────────── */}
      <div style={{
        marginTop: '12px',
        display: 'flex', justifyContent: 'space-between',
        fontSize: '7.5pt', fontFamily: 'Arial, sans-serif', color: '#333'
      }}>
        {/* Verified by QPSC Member */}
        <div>
          Verified by QPSC Member{' '}
          <div style={{ borderTop: '1px solid #000', width: '120px', marginTop: '24px' }}></div>
          <div style={{ fontSize: '6.5pt', color: '#666', marginTop: '1px' }}>QPSC Member</div>
        </div>
        {/* Approved by HoD */}
        <div style={{ textAlign: 'right' }}>
          Approved by HoD{' '}
          <div style={{ fontWeight: 700, fontSize: '7.5pt', marginTop: '18px', lineHeight: '1.4' }}>
            <div style={{ borderTop: '1px solid #000', display: 'inline-block', width: '120px' }}></div>
            PROF &amp; HEAD<br />
            MASTER OF COMPUTER APPLICATIONS<br />
            M. Visvesvaraya Institute of Technology<br />
            Hunasamaranahalli, Bangalore-562 157
          </div>
        </div>
      </div>

    </div>
  );
};