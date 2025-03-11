import { useState } from 'react'
import { Dropzone } from '@mantine/dropzone'
import { Text, Progress, Paper, Stack, Group } from '@mantine/core'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FileUploadProps {
  onUploadSuccess: () => void
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')

  const handleDrop = async (files: File[]) => {
    const file = files[0]
    if (!file) return

    setUploadStatus('uploading')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name)

    try {
      const response = await fetch('http://localhost:8000/api/models/', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      setUploadStatus('success')
      onUploadSuccess()
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
    }
  }

  return (
    <Paper shadow="md" p="md" withBorder mb="md" style={{ background: '#2C2E33' }}>
      <Stack>
        <Dropzone
          onDrop={handleDrop}
          accept={['.stl', '.obj']}
          maxSize={10 * 1024 ** 2}
          disabled={uploadStatus === 'uploading'}
          styles={{
            root: {
              border: '2px dashed #373A40',
              '&:hover': {
                borderColor: '#00b8d4',
              },
            },
          }}
        >
          <Group position="center" spacing="xl" style={{ minHeight: 80, pointerEvents: 'none' }}>
            <AnimatePresence mode="wait">
              {uploadStatus === 'idle' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Upload size={32} color="#00b8d4" />
                </motion.div>
              )}
              {uploadStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <CheckCircle size={32} color="#4CAF50" />
                </motion.div>
              )}
              {uploadStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <AlertCircle size={32} color="#f44336" />
                </motion.div>
              )}
            </AnimatePresence>
            <div>
              <Text size="xl" inline c="dimmed">
                Drag & drop your 3D model here
              </Text>
              <Text size="sm" c="dimmed" inline mt={7}>
                Supports STL and OBJ files up to 10MB
              </Text>
            </div>
          </Group>
        </Dropzone>
        {uploadStatus === 'uploading' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Progress
              value={uploadProgress}
              size="sm"
              radius="xl"
              color="cyan"
              striped
              animated
            />
          </motion.div>
        )}
      </Stack>
    </Paper>
  )
} 