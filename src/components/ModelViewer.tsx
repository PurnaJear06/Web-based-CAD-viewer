import React, { useState, useEffect, Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

// Direct imports with .js extension
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

interface ModelViewerProps {
  modelId: string | null
}

// Theme type definition
type Theme = 'dark' | 'light';

// View mode type definition
type ViewMode = 'normal' | 'wireframe' | 'x-ray';

// Fallback component when loading models
function LoadingBox() {
  const mesh = useRef<THREE.Mesh>(null)
  
  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.x += 0.01
      mesh.current.rotation.y += 0.01
    }
  })
  
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#00b8d4" wireframe />
    </mesh>
  )
}

// Camera and scene setup component
function SceneSetup({ viewMode }: { viewMode: ViewMode }) {
  const { scene, camera } = useThree();
  const controlsRef = useRef<any>();
  
  // Auto-center camera on model
  useEffect(() => {
    if (!controlsRef.current) return;
    
    // Find all meshes in the scene
    const meshes: THREE.Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshes.push(object);
      }
    });
    
    if (meshes.length === 0) return;
    
    // Calculate bounding box for all meshes
    const box = new THREE.Box3();
    for (const mesh of meshes) {
      box.expandByObject(mesh);
    }
    
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    
    // Set controls target to center
    controlsRef.current.target.copy(center);
    
    // Position camera to see the whole model
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov * (Math.PI / 180) : 45 * (Math.PI / 180);
      const distance = (maxDim / 2) / Math.tan(fov / 2) * 2.5; // Add margin
      
      const direction = new THREE.Vector3(1, 1, 1).normalize();
      camera.position.copy(center).add(direction.multiplyScalar(distance));
      camera.lookAt(center);
      
      // Update controls
      controlsRef.current.update();
    }
  }, [scene, camera]);
  
  return (
    <>
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Add grid for better orientation */}
      <Grid 
        position={[0, -1, 0]} 
        args={[20, 20]} 
        cellSize={1} 
        cellThickness={0.5} 
        cellColor="#606060" 
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#808080"
        fadeDistance={30}
        fadeStrength={1}
        visible={viewMode !== 'x-ray'}
      />
      
      <OrbitControls 
        ref={controlsRef}
        enablePan 
        enableZoom 
        enableRotate 
        autoRotate={false}
        autoRotateSpeed={1}
      />
    </>
  );
}

// Basic model component that loads STL or OBJ files
function Model({ url, fileFormat, viewMode, objectColor }: { url: string, fileFormat: string, viewMode: ViewMode, objectColor: string }) {
  const [model, setModel] = useState<THREE.Object3D | null>(null)
  const [error, setError] = useState<string | null>(null)
  const modelRef = useRef<THREE.Group>(new THREE.Group())
  
  useEffect(() => {
    console.log('Loading model:', url, 'Format:', fileFormat)
    let isActive = true
    
    const loadModel = async () => {
      try {
        if (fileFormat === 'stl') {
          console.log('Using STLLoader')
          const loader = new STLLoader()
          
          loader.load(
            url,
            (geometry) => {
              if (!isActive) return
              
              console.log('STL loaded successfully', geometry)
              
              // Compute vertex normals if they don't exist
              if (!geometry.attributes.normal) {
                geometry.computeVertexNormals();
              }
              
              // Create material based on view mode
              const material = createMaterial(viewMode);
              
              const mesh = new THREE.Mesh(geometry, material)
              
              // Center and scale the model
              geometry.computeBoundingBox();
              if (geometry.boundingBox) {
                const box = geometry.boundingBox;
                const center = new THREE.Vector3();
                const size = new THREE.Vector3();
                
                box.getCenter(center);
                box.getSize(size);
                
                // Center the geometry
                mesh.position.set(-center.x, -center.y, -center.z);
                
                // Scale the model to a reasonable size
                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0) {
                  const scale = 2 / maxDim;
                  mesh.scale.set(scale, scale, scale);
                }
              }
              
              if (modelRef.current) {
                modelRef.current.clear() // Remove any existing children
                modelRef.current.add(mesh)
              }
              
              setModel(modelRef.current)
              console.log('STL model set')
            },
            (progress) => {
              const percent = Math.round((progress.loaded / progress.total) * 100)
              console.log(`Loading STL: ${percent}%`)
            },
            (err) => {
              console.error('STL load error:', err)
              setError('Failed to load STL model')
            }
          )
        } else if (fileFormat === 'obj') {
          console.log('Using OBJLoader')
          const loader = new OBJLoader()
          
          loader.load(
            url,
            (obj) => {
              if (!isActive) return
              
              console.log('OBJ loaded successfully', obj)
              
              // Calculate bounding box for scaling
              const box = new THREE.Box3().setFromObject(obj);
              const center = new THREE.Vector3();
              const size = new THREE.Vector3();
              
              box.getCenter(center);
              box.getSize(size);
              
              // Center the object
              obj.position.set(-center.x, -center.y, -center.z);
              
              // Scale the model to a reasonable size
              const maxDim = Math.max(size.x, size.y, size.z);
              if (maxDim > 0) {
                const scale = 2 / maxDim;
                obj.scale.set(scale, scale, scale);
              }
              
              // Apply material to all meshes based on view mode
              obj.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.material = createMaterial(viewMode);
                }
              });
              
              if (modelRef.current) {
                modelRef.current.clear() // Remove any existing children
                modelRef.current.add(obj)
              }
              
              setModel(modelRef.current)
              console.log('OBJ model set')
            },
            (progress) => {
              const percent = Math.round((progress.loaded / progress.total) * 100)
              console.log(`Loading OBJ: ${percent}%`)
            },
            (err) => {
              console.error('OBJ load error:', err)
              setError('Failed to load OBJ model')
            }
          )
        } else {
          setError(`Unsupported file format: ${fileFormat}`)
        }
      } catch (err) {
        console.error('Error in model loading process:', err)
        setError(`Loading error: ${err}`)
      }
    }
    
    loadModel()
    
    return () => {
      isActive = false
    }
  }, [url, fileFormat, viewMode])
  
  // Create material based on view mode
  const createMaterial = (mode: ViewMode) => {
    switch (mode) {
      case 'wireframe':
        return new THREE.MeshStandardMaterial({
          color: objectColor,
          metalness: 0.3,
          roughness: 0.5,
          wireframe: true
        });
      case 'x-ray':
        return new THREE.MeshPhongMaterial({
          color: objectColor,
          opacity: 0.5,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide
        });
      case 'normal':
      default:
        return new THREE.MeshStandardMaterial({
          color: objectColor,
          metalness: 0.3,
          roughness: 0.5
        });
    }
  };
  
  // Ensure immediate color change
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.color.set(objectColor);
        }
      });
    }
  }, [objectColor]);
  
  if (error) {
    // Log the error in useEffect, not in render to avoid ReactNode error
    useEffect(() => {
      console.error('Model viewer error:', error)
    }, [error])
    
    return (
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    )
  }
  
  if (!model) {
    return <LoadingBox />
  }
  
  return <primitive object={model} />
}

export function ModelViewer({ modelId }: ModelViewerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [modelInfo, setModelInfo] = useState<{name: string, file_format: string} | null>(null)
  const [theme, setTheme] = useState<Theme>('dark')
  const [viewMode, setViewMode] = useState<ViewMode>('normal')
  const [autoRotate, setAutoRotate] = useState(false)
  const [backgroundColor, setBackgroundColor] = useState('#25262b');
  const [objectColor, setObjectColor] = useState('#00b8d4');
  
  // Get theme colors
  const getThemeColors = () => {
    return theme === 'dark' 
      ? { 
          background: '#1A1B1E', 
          surface: '#25262b', 
          border: '#373A40',
          text: '#C1C2C5',
          textSecondary: '#909296',
          accent: '#00b8d4'
        }
      : {
          background: '#f8f9fa',
          surface: '#ffffff',
          border: '#dee2e6',
          text: '#212529',
          textSecondary: '#6c757d',
          accent: '#0d6efd'
        };
  };
  
  const colors = getThemeColors();
  
  // Toggle theme
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  // Clear error
  const clearError = () => {
    setError(null);
  };
  
  // Ensure model URL is valid and log errors
  useEffect(() => {
    if (!modelId) {
      setModelUrl(null)
      setModelInfo(null)
      return
    }
    
    const fetchModel = async () => {
      setLoading(true)
      setError(null)
      
      try {
        console.log(`Fetching model with ID: ${modelId}`)
        
        // Step 1: Get model details
        const detailsResponse = await fetch(`http://localhost:8000/api/models/${modelId}/`)
        if (!detailsResponse.ok) {
          throw new Error(`Failed to fetch model details: ${detailsResponse.status}`)
        }
        
        const modelData = await detailsResponse.json()
        console.log('Model details:', modelData)
        
        setModelInfo({
          name: modelData.name,
          file_format: modelData.file_format
        })
        
        // Step 2: Download the model file
        console.log(`Downloading model from: http://localhost:8000/api/models/${modelId}/download/`)
        const fileResponse = await fetch(`http://localhost:8000/api/models/${modelId}/download/`)
        
        if (!fileResponse.ok) {
          throw new Error(`Failed to download model: ${fileResponse.status}`)
        }
        
        const blob = await fileResponse.blob()
        console.log(`Downloaded model file (${blob.size} bytes)`)
        
        // Create a URL for the blob
        const url = URL.createObjectURL(blob)
        console.log('Created object URL:', url)
        setModelUrl(url)
      } catch (err) {
        console.error('Error in fetch process:', err)
        setError(`Error: ${err}`)
      } finally {
        setLoading(false)
      }
    }
    
    fetchModel()
    
    // Clean up URL when component unmounts or modelId changes
    return () => {
      if (modelUrl) {
        console.log('Revoking object URL:', modelUrl)
        URL.revokeObjectURL(modelUrl)
      }
    }
  }, [modelId])
  
  // Apply dark mode to the entire document and ensure all elements reflect the theme
  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#1A1B1E' : '#f8f9fa';
    document.body.style.color = theme === 'dark' ? '#C1C2C5' : '#212529';
    // Update other elements if needed
  }, [theme]);
  
  // Content for different states
  if (!modelId) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.text,
        textAlign: 'center',
        padding: '20px',
        backgroundColor: colors.background,
      }}>
        <div>
          <h3 style={{ marginBottom: '10px' }}>No Model Selected</h3>
          <p>Upload and select a model from the sidebar to view it here</p>
        </div>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.text,
        textAlign: 'center',
        padding: '20px',
        backgroundColor: colors.background,
      }}>
        <div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: `4px solid ${colors.border}`,
            borderTopColor: colors.accent,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p>Loading model data...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f44336',
        textAlign: 'center',
        padding: '20px',
        backgroundColor: colors.background,
      }}>
        <div>
          <h3 style={{ marginBottom: '10px' }}>Error</h3>
          <p>{error}</p>
          <button 
            style={{
              marginTop: '20px',
              padding: '8px 16px',
              backgroundColor: colors.accent,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={clearError}
          >
            Clear Error
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.background,
      color: colors.text,
    }}>
      {/* Header with model info and theme toggle */}
      <div style={{
        padding: '10px 15px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.surface,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ color: colors.accent, margin: '0 0 5px 0' }}>
            {modelInfo?.name}
          </h3>
          <p style={{ fontSize: '12px', color: colors.textSecondary, margin: 0 }}>
            Format: {modelInfo?.file_format.toUpperCase()}
          </p>
        </div>
        
        {/* Theme toggle button */}
        <button
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.text,
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
      
      {/* 3D Viewer */}
      <div style={{ flex: 1, position: 'relative' }}>
        {modelUrl && modelInfo ? (
          <Canvas
            camera={{ position: [0, 0, 5], fov: 50 }}
            style={{ background: backgroundColor }}
          >
            <SceneSetup viewMode={viewMode} />
            
            <Suspense fallback={<LoadingBox />}>
              <Model 
                url={modelUrl} 
                fileFormat={modelInfo.file_format}
                viewMode={viewMode}
                objectColor={objectColor}
              />
            </Suspense>
          </Canvas>
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textSecondary,
          }}>
            <p>No model data available</p>
          </div>
        )}
        
        {/* View controls overlay */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px',
          padding: '8px 12px',
          backgroundColor: colors.surface,
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 10
        }}>
          <button
            style={{
              backgroundColor: viewMode === 'normal' ? colors.accent : 'transparent',
              color: viewMode === 'normal' ? 'white' : colors.text,
              border: `1px solid ${colors.border}`,
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={() => setViewMode('normal')}
          >
            Normal
          </button>
          
          <button
            style={{
              backgroundColor: viewMode === 'wireframe' ? colors.accent : 'transparent',
              color: viewMode === 'wireframe' ? 'white' : colors.text,
              border: `1px solid ${colors.border}`,
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={() => setViewMode('wireframe')}
          >
            Wireframe
          </button>
          
          <button
            style={{
              backgroundColor: viewMode === 'x-ray' ? colors.accent : 'transparent',
              color: viewMode === 'x-ray' ? 'white' : colors.text,
              border: `1px solid ${colors.border}`,
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={() => setViewMode('x-ray')}
          >
            X-Ray
          </button>
          
          <button
            style={{
              backgroundColor: autoRotate ? colors.accent : 'transparent',
              color: autoRotate ? 'white' : colors.text,
              border: `1px solid ${colors.border}`,
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={() => setAutoRotate(!autoRotate)}
          >
            {autoRotate ? 'Stop Rotation' : 'Auto Rotate'}
          </button>
        </div>
        
        {/* Color controls */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px',
          padding: '8px 12px',
          backgroundColor: colors.surface,
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 10
        }}>
          <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
          <input type="color" value={objectColor} onChange={(e) => setObjectColor(e.target.value)} />
        </div>
      </div>
      
      {/* Debugging info */}
      <div style={{
        padding: '10px 15px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.surface,
        fontSize: '12px',
        color: colors.textSecondary,
      }}>
        <p style={{ margin: 0 }}>
          Model ID: {modelId} • 
          Format: {modelInfo?.file_format || 'Unknown'} •
          View Mode: {viewMode} •
          Theme: {theme}
        </p>
      </div>
      
      {/* Spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}