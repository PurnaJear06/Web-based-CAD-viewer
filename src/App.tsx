import React, { useState, useRef, useEffect } from 'react'
import { ModelViewer } from './components/ModelViewer'

function App() {
  const [models, setModels] = useState<any[]>([])
  const [activeModelId, setActiveModelId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch models on component mount
  useEffect(() => {
    fetchModels()
  }, [])

  // Fetch all models from the API
  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/models/')
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }
      const data = await response.json()
      setModels(data)
      
      // Auto-select first model if available and no model is selected
      if (data.length > 0 && !activeModelId) {
        setActiveModelId(data[0].id.toString())
      }
    } catch (error) {
      console.error('Error fetching models:', error)
    }
  }

  // Handle file selection via button
  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Handle file change (upload)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    // Check if file is an STL or OBJ file
    if (!file.name.toLowerCase().endsWith('.stl') && !file.name.toLowerCase().endsWith('.obj')) {
      setUploadError('Only STL and OBJ files are supported')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('name', file.name)
      formData.append('file', file)
      
      // Detect file format from file extension
      const fileFormat = file.name.split('.').pop()?.toLowerCase() || 'stl'
      formData.append('file_format', fileFormat)

      const response = await fetch('http://localhost:8000/api/models/', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload model')
      }

      // Get the newly created model and update the models list
      const newModel = await response.json()
      
      // Fetch latest models
      await fetchModels()
      
      // Automatically select the newly uploaded model
      setActiveModelId(newModel.id.toString())
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error uploading model:', error)
      setUploadError('Failed to upload model')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle model selection
  const handleModelSelect = (modelId: string) => {
    setActiveModelId(modelId)
  }

  // Handle model deletion
  const handleModelDelete = async (modelId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/models/${modelId}/`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete model')
      }

      // Update models list
      setModels(models.filter(model => model.id.toString() !== modelId))
      
      // If the active model was deleted, select another model
      if (activeModelId === modelId) {
        const remainingModels = models.filter(model => model.id.toString() !== modelId)
        setActiveModelId(remainingModels.length > 0 ? remainingModels[0].id.toString() : null)
      }
    } catch (error) {
      console.error('Error deleting model:', error)
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#1A1B1E',
      color: '#C1C2C5'
    }}>
      <header style={{ 
        padding: '20px', 
        borderBottom: '1px solid #373A40',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '24px',
          fontWeight: 600,
          color: '#00b8d4'
        }}>
          CAD Viewer
        </h1>
      </header>

      <div style={{ 
        display: 'flex', 
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Sidebar */}
        <div style={{ 
          width: '280px',
          padding: '20px',
          borderRight: '1px solid #373A40',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto'
        }}>
          {/* File Upload Section */}
          <div>
            <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Upload Model</h2>
            <div style={{ 
              padding: '20px', 
              border: '2px dashed #373A40',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '15px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: '#25262b',
              color: '#909296'
            }} 
            onClick={handleFileSelect}
            onDrop={(e) => {
              e.preventDefault()
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const dummyEvent = {
                  target: { files: e.dataTransfer.files }
                } as React.ChangeEvent<HTMLInputElement>
                handleFileChange(dummyEvent)
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <div>
                <p style={{ marginBottom: '5px' }}>Drag and drop your model here</p>
                <p style={{ fontSize: '12px' }}>Supports .STL and .OBJ files</p>
              </div>
              <button style={{
                padding: '8px 16px',
                backgroundColor: '#00b8d4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}>
                {isUploading ? 'Uploading...' : 'Select File'}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".stl,.obj"
                onChange={handleFileChange}
              />
            </div>
            {uploadError && (
              <p style={{ 
                color: '#f44336', 
                marginTop: '10px', 
                fontSize: '14px' 
              }}>
                {uploadError}
              </p>
            )}
          </div>
          
          {/* Models List */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Models</h2>
            {models.length === 0 ? (
              <p style={{ 
                color: '#909296', 
                fontSize: '14px',
                textAlign: 'center',
                padding: '20px 0'
              }}>
                No models available. Upload a model to get started.
              </p>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px' 
              }}>
                {models.map(model => (
                  <div 
                    key={model.id}
                    style={{ 
                      padding: '10px 15px',
                      borderRadius: '4px',
                      backgroundColor: activeModelId === model.id.toString() ? '#2C2E33' : 'transparent',
                      border: '1px solid #373A40',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleModelSelect(model.id.toString())}
                  >
                    <div>
                      <p style={{ 
                        marginBottom: '4px',
                        color: activeModelId === model.id.toString() ? '#00b8d4' : '#C1C2C5',
                        fontWeight: activeModelId === model.id.toString() ? 500 : 400,
                      }}>
                        {model.name}
                      </p>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#909296',
                        margin: 0 
                      }}>
                        {model.file_format.toUpperCase()}
                      </p>
                    </div>
                    <button 
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#909296',
                        cursor: 'pointer',
                        padding: '5px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleModelDelete(model.id.toString())
                      }}
                      title="Delete model"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content Area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <ModelViewer modelId={activeModelId} />
        </div>
      </div>
    </div>
  )
}

export default App