import { useEffect, useState } from 'react'
import { Paper, Text, Stack, Button, Group } from '@mantine/core'
import { File, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Model {
  id: string
  name: string
  file_format: string
  uploaded_at: string
}

interface ModelListProps {
  onModelSelect: (id: string | null) => void
  activeModel: string | null
}

export function ModelList({ onModelSelect, activeModel }: ModelListProps) {
  const [models, setModels] = useState<Model[]>([])

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/models/')
      if (!response.ok) throw new Error('Failed to fetch models')
      const data = await response.json()
      setModels(data)
    } catch (error) {
      console.error('Error fetching models:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/models/${id}/`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete model')
      fetchModels()
      if (activeModel === id) {
        onModelSelect(null)
      }
    } catch (error) {
      console.error('Error deleting model:', error)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  return (
    <Stack>
      <Text c="dimmed" size="sm" weight={500} mb="xs">
        Uploaded Models
      </Text>
      <Paper shadow="md" p="md" withBorder style={{ background: '#2C2E33' }}>
        <AnimatePresence mode="popLayout">
          {models.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center">
              No models uploaded yet
            </Text>
          ) : (
            models.map((model) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Paper
                  p="xs"
                  mb="xs"
                  withBorder
                  style={{
                    background: activeModel === model.id ? '#373A40' : '#25262B',
                  }}
                >
                  <Group position="apart">
                    <Group>
                      <File
                        size={20}
                        color={activeModel === model.id ? '#00b8d4' : '#909296'}
                      />
                      <div>
                        <Text size="sm" weight={500}>
                          {model.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {model.file_format.toUpperCase()}
                        </Text>
                      </div>
                    </Group>
                    <Group spacing={8}>
                      <Button
                        variant="subtle"
                        size="xs"
                        color={activeModel === model.id ? 'gray' : 'cyan'}
                        onClick={() =>
                          onModelSelect(activeModel === model.id ? null : model.id)
                        }
                      >
                        {activeModel === model.id ? 'Hide' : 'View'}
                      </Button>
                      <Button
                        variant="subtle"
                        size="xs"
                        color="red"
                        onClick={() => handleDelete(model.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </Group>
                  </Group>
                </Paper>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </Paper>
    </Stack>
  )
} 