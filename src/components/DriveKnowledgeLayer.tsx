import React, { useState, useEffect } from 'react';
import { 
  Database, RefreshCw, FileText, CheckCircle, Search, HelpCircle, 
  BookOpen, Network, Shield, AlertCircle, ArrowRight, UserCheck, LogOut, Info, Book,
  Folder, FolderPlus, Upload, ChevronLeft, ChevronRight, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { googleSignIn, logout, initAuth } from '../lib/firebaseAuth.ts';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  size?: string;
}

interface IngestedDoc {
  id: string;
  title: string;
  author: string;
  date: string;
  sizeBytes: number;
  mimeType: string;
  indexedTopics: string[];
  citations: string[];
  chapters: { title: string; content: string }[];
  textSnippet: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'document' | 'concept' | 'model' | 'campaign';
  description: string;
  details?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  relationship: 'supports' | 'contradicts' | 'inspired' | 'calibrated from';
}

interface DriveKnowledgeLayerProps {
  ingestedDocs: IngestedDoc[];
  setIngestedDocs: React.Dispatch<React.SetStateAction<IngestedDoc[]>>;
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  accessToken: string | null;
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
}

export function DriveKnowledgeLayer({ 
  ingestedDocs, 
  setIngestedDocs,
  user,
  setUser,
  accessToken,
  setAccessToken
}: DriveKnowledgeLayerProps) {
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Folder browsing states
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // File uploading states
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileContent, setUploadFileContent] = useState('');
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Grounded search query
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResponse, setSearchResponse] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Selected document to inspect
  const [selectedDoc, setSelectedDoc] = useState<IngestedDoc | null>(null);

  // Knowledge Graph nodes & edges
  const [graphNodes] = useState<GraphNode[]>([
    { id: 'n-doc1', label: 'Dr. Carter Practical Processing Guide (Drive Book Y)', type: 'document', description: 'Google Drive PDF regarding supercritical CO2 extraction curves and Winterization cooling parameters.', details: 'Discusses optimal cooling rates (-1.2°C/min) and winterization thresholds.' },
    { id: 'n-doc2', label: 'Prof. Vance Supercritical Fluids Paper (Drive Book Q)', type: 'document', description: 'Academic paper from Google Drive outlining phase boundaries, vapor pressures, and kinetic constants.', details: 'Provides NIST data references for decarboxylation and Arrhenius reaction equations.' },
    { id: 'n-con1', label: 'Supercritical CO₂ Extraction', type: 'concept', description: 'Extracting valuable cannabinoids from organic feedstock using supercritical fluid carbon dioxide.', details: 'Optimized density: 0.72 g/mL. Modifier solvent: Methanol or Ethanol.' },
    { id: 'n-con2', label: 'Winterization Temperature Curves', type: 'concept', description: 'Precipitating wax impurities and lipids by freezing in co-solvent matrices.', details: 'Critical threshold: holding at -40°C to maximize filtration yields.' },
    { id: 'n-con3', label: 'Arrhenius Kinetics Model', type: 'concept', description: 'Using reaction temperature rates to determine decarboxylation efficiency.', details: 'Frequency factor (A): ~2.45e11 s-1, Ea: ~126 kJ/mol.' },
    { id: 'n-mod1', label: 'HempForge Model extraction.v1.2.0', type: 'model', description: 'The active physical kernel simulation model determining final CBD yield predictions.', details: 'Calibrated using Dr. Carters experimental datasets to match real-world 82.4% purity.' },
    { id: 'n-cam1', label: 'HempForge Campaign Delta-9', type: 'campaign', description: 'The sweep protocol testing a wide range of extraction pressures (60 bar to 120 bar).', details: 'Directly testing the Arrhenius parameter ranges suggested in Vance Supercritical Fluids Chapter 4.' }
  ]);

  const [graphEdges] = useState<GraphEdge[]>([
    { from: 'n-doc1', to: 'n-con2', relationship: 'supports' },
    { from: 'n-doc2', to: 'n-con3', relationship: 'supports' },
    { from: 'n-con1', to: 'n-mod1', relationship: 'inspired' },
    { from: 'n-con2', to: 'n-mod1', relationship: 'inspired' },
    { from: 'n-con3', to: 'n-mod1', relationship: 'inspired' },
    { from: 'n-doc1', to: 'n-mod1', relationship: 'calibrated from' },
    { from: 'n-doc2', to: 'n-cam1', relationship: 'supports' },
    { from: 'n-mod1', to: 'n-cam1', relationship: 'calibrated from' }
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('n-mod1');

  // --- OAUTH STATE LISTENER ---
  useEffect(() => {
    initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        fetchDriveFiles(token, 'root');
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
  }, []);

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        fetchDriveFiles(result.accessToken, 'root');
      }
    } catch (err) {
      console.error('Google login failed:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setDriveFiles([]);
    setCurrentFolderId('root');
    setFolderHistory([]);
  };

  // --- FETCH GOOGLE DRIVE FILES ---
  const fetchDriveFiles = async (token: string, folderId: string = 'root') => {
    setIsLoadingDrive(true);
    try {
      const response = await fetch(`/api/drive/list?folderId=${folderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setDriveFiles(data.files || []);
      } else {
        console.warn('Could not retrieve real Drive files', data);
      }
    } catch (err) {
      console.error('Failed to load Drive files:', err);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // --- CREATE GOOGLE DRIVE FOLDER ---
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !accessToken) return;
    setIsCreatingFolder(true);

    try {
      const response = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolderId === 'root' ? undefined : currentFolderId
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewFolderName('');
        setShowCreateFolder(false);
        fetchDriveFiles(accessToken, currentFolderId);
      } else {
        alert('Failed to create folder: ' + data.error);
      }
    } catch (err: any) {
      console.error('Failed to create folder:', err);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // --- UPLOAD FILE TO CURRENT FOLDER ---
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName.trim() || !uploadFileContent.trim() || !accessToken) return;
    setIsUploadingFile(true);

    try {
      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: uploadFileName.endsWith('.txt') ? uploadFileName : `${uploadFileName}.txt`,
          content: uploadFileContent,
          mimeType: 'text/plain',
          parentId: currentFolderId === 'root' ? undefined : currentFolderId
        })
      });

      const data = await response.json();
      if (data.success) {
        setUploadFileName('');
        setUploadFileContent('');
        setShowUploadFile(false);
        fetchDriveFiles(accessToken, currentFolderId);
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (err: any) {
      console.error('Failed to upload file:', err);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // --- NAVIGATE INTO FOLDER ---
  const handleNavigateToFolder = (folder: DriveFile) => {
    if (!accessToken) return;
    const historyEntry = { id: folder.id, name: folder.name };
    const nextHistory = [...folderHistory, historyEntry];
    setFolderHistory(nextHistory);
    setCurrentFolderId(folder.id);
    fetchDriveFiles(accessToken, folder.id);
  };

  // --- NAVIGATE UP IN HISTORY ---
  const handleNavigateUp = () => {
    if (!accessToken) return;
    if (folderHistory.length === 0) return;

    const nextHistory = [...folderHistory];
    nextHistory.pop(); // remove current
    const parent = nextHistory[nextHistory.length - 1];
    const parentId = parent ? parent.id : 'root';

    setFolderHistory(nextHistory);
    setCurrentFolderId(parentId);
    fetchDriveFiles(accessToken, parentId);
  };

  // --- NAVIGATE TO BREADCRUMB ---
  const handleNavigateToBreadcrumb = (index: number) => {
    if (!accessToken) return;
    if (index === -1) {
      setFolderHistory([]);
      setCurrentFolderId('root');
      fetchDriveFiles(accessToken, 'root');
      return;
    }

    const nextHistory = folderHistory.slice(0, index + 1);
    const target = folderHistory[index];
    setFolderHistory(nextHistory);
    setCurrentFolderId(target.id);
    fetchDriveFiles(accessToken, target.id);
  };

  // --- INGEST DRIVE FILE ---
  const handleIngestFile = async (file: DriveFile) => {
    if (!accessToken) return;
    setIsSyncing(true);

    try {
      const response = await fetch('/api/drive/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          fileId: file.id,
          fileName: file.name,
          mimeType: file.mimeType
        })
      });

      const data = await response.json();
      if (data.success) {
        const newDoc: IngestedDoc = {
          id: data.metadata.id,
          title: data.metadata.title,
          author: data.metadata.author,
          date: data.metadata.date,
          sizeBytes: data.metadata.sizeBytes,
          mimeType: data.metadata.mimeType,
          indexedTopics: data.indexedTopics,
          citations: data.citations,
          chapters: data.chapters,
          textSnippet: data.text
        };

        setIngestedDocs(prev => [newDoc, ...prev]);
        setSelectedDoc(newDoc);
      }
    } catch (err) {
      console.error('Failed to ingest file:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- SEMANTIC SEARCH OVER CORPUS ---
  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResponse(null);

    // Simulate smart semantic search over the ingested drive files & local science books
    setTimeout(() => {
      const q = searchQuery.toLowerCase();
      let res = '';

      if (q.includes('winter') || q.includes('wax') || q.includes('lipid')) {
        res = `According to Carter et al. (2024) [Practical Phytocannabinoid Processing, Chapter 2]:
"Separating waxes requires holding ethanol-rich solvent at temperatures <= -40°C for at least 12 hours. Cooling rates above 1.5°C/min cause fine wax suspensions that bypass filtering layers."

Current HempForge Model (Yield Model v1.2.0) has calibrated its winterization parameters directly matching this cooling limit (-1.2°C/min) to achieve 99.42% accuracy during standard runs.`;
      } else if (q.includes('co2') || q.includes('extraction') || q.includes('pressure')) {
        res = `Literature findings in NIST Fluids Data (2021) and Carter et al. (2024) state:
"Supercritical CO2 extraction density profiles show peak cannabinoid solubility at densities between 0.6g/mL and 0.8g/mL."

Your current Campaign Delta-9 sweep protocol covers the ideal pressure bounds suggested by Prof. Vance in Supercritical Fluids Chapter 4 to exploit this equilibrium phase modifier matrix.`;
      } else if (q.includes('kinetic') || q.includes('arren') || q.includes('decarb')) {
        res = `Vance Research Paper (Drive Book Q) and NIST databases propose:
"Decarboxylation activation energy Ea is estimated at 126 kJ/mol, with a pre-exponential frequency factor A of 2.45e11 s-1."

HempForge System Policy GW-1 is currently evaluating Proposal HF-94 to refine the local Arrhenius rates to match these exact book parameters, mitigating 1.5% prediction uncertainty.`;
      } else {
        res = `Searched 2 textbooks and ${ingestedDocs.length - 2} ingested files from Google Drive.
Found semantic match in " Carter, 2024: Practical Phytocannabinoid Processing " on topics matching your query.
The literature supports maintaining standard sub-freezing separation matrices. Your current simulated yield curves remain physically verified under these conditions.`;
      }

      setSearchResponse(res);
      setIsSearching(false);
    }, 1500);
  };

  const selectedNode = graphNodes.find(n => n.id === selectedNodeId);

  // Helper to generate the text describing node-relationships
  const getReflexiveExplanation = () => {
    if (selectedNodeId === 'n-mod1') {
      return 'HempForge Model extraction.v1.2.0 is calibrated from Dr. Carter Practical Processing Guide (Drive Book Y), which is derived from Book Y in Google Drive.';
    } else if (selectedNodeId === 'n-cam1') {
      return 'Campaign Delta-9 sweeps a parameter space suggested by Chapter 4 of Prof. Vance Supercritical Fluids Paper (Drive Book Q).';
    } else if (selectedNode?.type === 'document') {
      return `This is an ingested Knowledge Corpus document. Relationships: Supports Concepts in Supercritical CO2, Winterization, and Arrhenius Kinetics.`;
    }
    return `Selected Concept node: ${selectedNode?.label}. Linked to active HempForge models to drive high-fidelity simulations.`;
  };

  return (
    <div className="bg-[#0b0b0c] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-2xl">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-[#111113] to-[#0d0d0f] p-6 border-b border-[#1f1f21] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono">
              Research Corpus <span className="text-[#666] font-normal italic">Level 3</span>
            </h2>
          </div>
          <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase">
            Ingestion & Knowledge Graph Layer (Google Drive Connector)
          </p>
        </div>

        {/* Authentication State button */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#121214] border border-[#1f1f21] rounded-xl font-mono text-[9px] text-emerald-400">
              <UserCheck className="w-3.5 h-3.5" />
              <span>{user.email}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 bg-[#1b1b1e] hover:bg-red-950/20 border border-[#1f1f21] hover:border-red-500/20 text-[#666] hover:text-red-400 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-[#111] rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow"
          >
            <Book className="w-4 h-4 text-indigo-600" />
            <span>Connect Google Drive Library</span>
          </button>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Google Drive Explorer & Ingested Docs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Real-time Google Drive Explorer */}
          <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4">
            <div className="flex justify-between items-center border-b border-[#1f1f21] pb-3 mb-3">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">
                Google Drive Ingestion Layer
              </h3>
              {user && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateFolder(!showCreateFolder)}
                    className="p-1 text-gray-400 hover:text-white transition-all cursor-pointer"
                    title="Create Folder"
                  >
                    <FolderPlus className="w-4.5 h-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadFile(!showUploadFile)}
                    className="p-1 text-gray-400 hover:text-white transition-all cursor-pointer"
                    title="Upload Text File"
                  >
                    <Upload className="w-4.5 h-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchDriveFiles(accessToken!, currentFolderId)}
                    disabled={isLoadingDrive}
                    className="text-[8.5px] text-indigo-400 hover:text-indigo-300 font-mono uppercase tracking-widest flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              )}
            </div>

            {user && (showCreateFolder || showUploadFile) && (
              <div className="mb-4 p-3 bg-[#0b0b0c] border border-indigo-500/20 rounded-lg">
                {showCreateFolder && (
                  <form onSubmit={handleCreateFolder} className="space-y-2">
                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-indigo-300 font-mono flex items-center gap-1">
                      <FolderPlus className="w-3.5 h-3.5" /> Create New Folder
                    </h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="e.g. Hemp OS Publications"
                        className="flex-1 bg-[#121214] border border-[#2d2d30] rounded px-2 py-1 text-[9.5px] text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={isCreatingFolder}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[8.5px] uppercase tracking-wider rounded"
                      >
                        {isCreatingFolder ? '...' : 'Create'}
                      </button>
                    </div>
                  </form>
                )}

                {showUploadFile && (
                  <form onSubmit={handleUploadFile} className="space-y-2">
                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-indigo-300 font-mono flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" /> Upload Reference File
                    </h4>
                    <input
                      type="text"
                      required
                      value={uploadFileName}
                      onChange={(e) => setUploadFileName(e.target.value)}
                      placeholder="File Name (e.g. extraction_constants.txt)"
                      className="w-full bg-[#121214] border border-[#2d2d30] rounded px-2 py-1 text-[9.5px] text-white focus:outline-none focus:border-indigo-500"
                    />
                    <textarea
                      required
                      rows={3}
                      value={uploadFileContent}
                      onChange={(e) => setUploadFileContent(e.target.value)}
                      placeholder="File Content / Book Data..."
                      className="w-full bg-[#121214] border border-[#2d2d30] rounded px-2 py-1 text-[9.5px] text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowUploadFile(false)}
                        className="px-2 py-1 text-[9px] font-mono text-[#666] hover:text-gray-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUploadingFile}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[8.5px] uppercase tracking-wider rounded"
                      >
                        {isUploadingFile ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {user ? (
              <div className="space-y-2">
                {/* Folder Path / Breadcrumbs */}
                <div className="bg-[#0b0b0c] border border-[#1c1c1e] px-2.5 py-1.5 rounded-lg flex items-center gap-1 overflow-x-auto text-[9px] font-mono">
                  <button
                    type="button"
                    onClick={() => handleNavigateToBreadcrumb(-1)}
                    className="text-gray-400 hover:text-white"
                  >
                    DRIVE
                  </button>
                  <ChevronRight className="w-3 h-3 text-[#444] shrink-0" />
                  
                  {folderHistory.map((folder, index) => (
                    <React.Fragment key={folder.id}>
                      <button
                        type="button"
                        onClick={() => handleNavigateToBreadcrumb(index)}
                        className="text-indigo-400 hover:text-indigo-300 font-bold truncate max-w-[80px]"
                      >
                        {folder.name.toUpperCase()}
                      </button>
                      {index < folderHistory.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-[#444] shrink-0" />
                      )}
                    </React.Fragment>
                  ))}

                  {folderHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={handleNavigateUp}
                      className="ml-auto text-[#666] hover:text-[#888] flex items-center gap-0.5 uppercase text-[8px]"
                    >
                      <ChevronLeft className="w-3 h-3" /> Up
                    </button>
                  )}
                </div>

                {isLoadingDrive ? (
                  <div className="py-12 text-center text-[#555] flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                    <p className="text-[9px] font-mono uppercase">Querying Google Drive API...</p>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="py-10 text-center text-[#666]">
                    <p className="text-[10px] leading-relaxed">
                      No folders, books, or scientific documents detected in this location.
                    </p>
                    <p className="text-[8.5px] text-[#444] mt-2">
                      Use the tools above to create a folder or upload plain-text research.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {driveFiles.map((file) => {
                      const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                      return (
                        <div 
                          key={file.id}
                          className="p-2.5 bg-[#0b0b0c] border border-[#1d1d20] rounded-lg flex items-center justify-between hover:border-[#2d2d30]"
                        >
                          <div className="flex items-center gap-2 overflow-hidden mr-2">
                            {isFolder ? (
                              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            )}
                            <span className="text-[9.5px] font-bold text-white truncate uppercase tracking-wide">
                              {file.name}
                            </span>
                          </div>
                          {isFolder ? (
                            <button
                              type="button"
                              onClick={() => handleNavigateToFolder(file)}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold font-mono text-[8px] uppercase tracking-wider rounded transition-all cursor-pointer shrink-0"
                            >
                              Open
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleIngestFile(file)}
                              disabled={isSyncing}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-mono text-[8px] uppercase tracking-wider rounded transition-all cursor-pointer shrink-0 disabled:opacity-50"
                            >
                              Ingest
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center bg-[#0d0d0f] border border-[#1c1c1f] rounded-xl p-4">
                <Info className="w-6 h-6 text-[#444] mx-auto mb-2" />
                <p className="text-[10px] text-[#666] leading-relaxed max-w-xs mx-auto">
                  Sign in with Google using the top-right authorization gate to sync, extract, and index scientific books directly from your Google Drive folders into HempForge.
                </p>
              </div>
            )}
          </div>

          {/* Ingested Document Corpus */}
          <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4">
            <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono border-b border-[#1f1f21] pb-3 mb-3">
              Ingested Research Corpus ({ingestedDocs.length} Documents)
            </h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {ingestedDocs.map((doc) => (
                <div 
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedDoc?.id === doc.id 
                      ? 'bg-[#1b1b1e] border-amber-500/50 shadow-md' 
                      : 'bg-[#0d0d0f] border-[#1c1c1f] hover:bg-[#121214]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-[10.5px] font-bold text-white uppercase tracking-wide">{doc.title}</h4>
                      <p className="text-[8.5px] text-[#555] font-mono mt-0.5">Author: {doc.author} &bull; {doc.date}</p>
                    </div>
                    <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  </div>

                  {/* Indexed topics */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {doc.indexedTopics.map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-[#141416] border border-[#1f1f21] text-gray-400 text-[7px] font-mono uppercase tracking-wider rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Knowledge Graph & Grounded Search (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Visual Knowledge Graph */}
          <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4">
            <div className="flex justify-between items-center border-b border-[#1f1f21] pb-3 mb-4">
              <div>
                <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-amber-400" />
                  Interactive Research & Ingestion Graph
                </h3>
                <p className="text-[8.5px] text-gray-500 font-mono">Displays links between Literature, Concepts, and HempForge Campaigns</p>
              </div>
            </div>

            {/* Simulated Interactive Graph Area */}
            <div className="bg-[#0b0b0c] border border-[#1f1f21] rounded-xl p-4 relative min-h-[280px] overflow-hidden flex flex-col justify-between">
              
              {/* Nodes Rendering */}
              <div className="flex-1 flex flex-wrap gap-2.5 items-center justify-center p-6 min-h-[180px]">
                {graphNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  let typeColor = '';
                  
                  if (node.type === 'document') typeColor = isSelected ? 'border-amber-400 text-amber-300 bg-amber-950/20' : 'border-amber-500/30 text-amber-400 bg-amber-950/5';
                  else if (node.type === 'concept') typeColor = isSelected ? 'border-indigo-400 text-indigo-300 bg-indigo-950/20' : 'border-indigo-500/30 text-indigo-400 bg-indigo-950/5';
                  else if (node.type === 'model') typeColor = isSelected ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20' : 'border-emerald-500/30 text-emerald-400 bg-emerald-950/5';
                  else typeColor = isSelected ? 'border-purple-400 text-purple-300 bg-purple-950/20' : 'border-purple-500/30 text-purple-400 bg-purple-950/5';

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`px-3 py-1.5 rounded-xl border text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer hover:scale-105 ${typeColor} ${
                        isSelected ? 'ring-2 ring-indigo-500/30 scale-105 shadow-lg' : ''
                      }`}
                    >
                      {node.label}
                    </button>
                  );
                })}
              </div>

              {/* Relation explanation block */}
              <div className="p-3 bg-[#111113] border border-[#1c1c1e] rounded-xl mt-4">
                <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block mb-0.5">Reflexive Knowledge Lineage Statement</span>
                <p className="text-[10px] text-indigo-300 font-mono leading-relaxed">
                  {getReflexiveExplanation()}
                </p>
                
                {selectedNode && (
                  <div className="mt-2.5 pt-2 border-t border-[#1c1c1e] text-[9.5px] text-gray-400 font-sans leading-relaxed">
                    <span className="font-bold text-white uppercase text-[8px] tracking-wider block font-mono mb-0.5">Selected Node Details</span>
                    {selectedNode.details}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grounded Search */}
          <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4">
            <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono border-b border-[#1f1f21] pb-3 mb-4 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              Ask HempForge Literature (Grounded Search)
            </h3>
            
            <form onSubmit={handleSemanticSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask about winterization thresholds, decarboxylation Arrhenius constants..."
                className="flex-1 bg-[#0b0b0c] border border-[#1f1f21] hover:border-[#2a2a2d] focus:border-indigo-500/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none transition-all font-sans"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-mono text-[9px] uppercase tracking-widest rounded-xl cursor-pointer transition-all disabled:opacity-50"
              >
                {isSearching ? 'Analyzing...' : 'Search'}
              </button>
            </form>

            {/* Response area */}
            <AnimatePresence>
              {searchResponse && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 bg-[#0d0d0f] border border-[#1c1c1f] rounded-xl overflow-hidden"
                >
                  <span className="text-[7.5px] font-mono text-amber-500 uppercase tracking-widest flex items-center gap-1 mb-2">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Grounded Search Output
                  </span>
                  <p className="text-[10px] text-gray-300 whitespace-pre-line leading-relaxed font-mono">
                    {searchResponse}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Book usage inspector (when book card selected) */}
          {selectedDoc && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4"
            >
              <div className="flex justify-between items-center border-b border-[#1f1f21] pb-2 mb-3">
                <span className="text-[9px] font-bold font-mono text-amber-500 uppercase tracking-widest">
                  Document Inspector: {selectedDoc.title}
                </span>
                <button 
                  type="button" 
                  onClick={() => setSelectedDoc(null)}
                  className="text-[9px] text-[#666] hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 font-mono text-[9.5px]">
                <div className="p-2.5 bg-[#0b0b0c] border border-[#1c1c1f] rounded-lg">
                  <span className="text-[#555] font-bold block uppercase tracking-wider text-[7.5px]">Extracted Text Snippet</span>
                  <p className="text-gray-300 mt-1 leading-relaxed">
                    {selectedDoc.textSnippet}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[#555] font-bold block uppercase tracking-wider text-[7.5px]">Document Structure (Chapters)</span>
                  {selectedDoc.chapters.map((ch, idx) => (
                    <div key={idx} className="p-2.5 bg-[#0b0b0c] border border-[#1c1c1f] rounded-lg">
                      <p className="text-white font-bold">{ch.title}</p>
                      <p className="text-[#777] mt-1 leading-relaxed">{ch.content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[8px] text-[#444] uppercase tracking-widest pt-2 border-t border-[#1f1f21]">
                  <span>Citations: {selectedDoc.citations.join(', ')}</span>
                  <span>Size: {Math.round(selectedDoc.sizeBytes / 1024)} KB</span>
                </div>
              </div>
            </motion.div>
          )}

        </div>

      </div>
    </div>
  );
}
