'use client'

import { useState, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { FiSend, FiDownload, FiTrash2, FiSearch, FiImage } from 'react-icons/fi'
import { HiSparkles } from 'react-icons/hi'
import { MdFilterList } from 'react-icons/md'
import { IoClose } from 'react-icons/io5'

const AGENT_ID = '698bebb370b73cefd2b3ec39'

// Theme colors - Sunset theme
const THEME_VARS = {
  '--background': '30 40% 98%',
  '--foreground': '20 40% 10%',
  '--card': '30 40% 96%',
  '--card-foreground': '20 40% 10%',
  '--popover': '30 40% 96%',
  '--popover-foreground': '20 40% 10%',
  '--primary': '24 95% 53%',
  '--primary-foreground': '30 40% 98%',
  '--secondary': '30 35% 92%',
  '--secondary-foreground': '20 40% 10%',
  '--muted': '30 30% 90%',
  '--muted-foreground': '20 25% 45%',
  '--accent': '12 80% 50%',
  '--accent-foreground': '30 40% 98%',
  '--destructive': '0 84% 60%',
  '--destructive-foreground': '30 40% 98%',
  '--border': '30 35% 88%',
  '--input': '30 30% 80%',
  '--ring': '24 95% 53%',
  '--radius': '0.875rem',
} as React.CSSProperties

interface SavedDesign {
  id: string
  imageUrl: string
  prompt: string
  timestamp: number
  specs?: any
  explanation?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  specs?: any
  timestamp: number
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('studio')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDesign, setSelectedDesign] = useState<SavedDesign | null>(null)
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({})

  // Load saved designs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('graphic_designs')
    if (saved) {
      try {
        setSavedDesigns(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load saved designs:', e)
      }
    }
  }, [])

  // Save designs to localStorage whenever they change
  useEffect(() => {
    if (savedDesigns.length > 0) {
      localStorage.setItem('graphic_designs', JSON.stringify(savedDesigns))
    }
  }, [savedDesigns])

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    }

    setChatHistory((prev) => [...prev, userMessage])
    setLoading(true)

    try {
      const result = await callAIAgent(prompt, AGENT_ID)

      // Debug: Log the full response structure
      console.log('Full API Response:', JSON.stringify(result, null, 2))

      if (result.success) {
        // Access the actual response data from result.response.result
        const responseData = result.response?.result || {}
        const explanation = responseData?.response?.raw_text ?? responseData?.raw_text ?? result.response?.message ?? ''
        const imageUrl = result?.module_outputs?.artifact_files?.url ?? ''
        const specs = responseData?.design_specifications ?? {}

        console.log('Extracted data:', { explanation, imageUrl, specs })

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: explanation,
          imageUrl: imageUrl,
          specs: specs,
          timestamp: Date.now(),
        }

        setChatHistory((prev) => [...prev, assistantMessage])
      } else {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Failed to generate design. Please try again.',
          timestamp: Date.now(),
        }
        setChatHistory((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'An error occurred while generating your design.',
        timestamp: Date.now(),
      }
      setChatHistory((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      setPrompt('')
    }
  }

  const handleSaveDesign = (message: ChatMessage) => {
    if (!message.imageUrl) return

    const newDesign: SavedDesign = {
      id: `design_${Date.now()}`,
      imageUrl: message.imageUrl,
      prompt: chatHistory.find((m) => m.role === 'user' && m.timestamp < message.timestamp)?.content ?? '',
      timestamp: message.timestamp,
      specs: message.specs,
      explanation: message.content,
    }

    setSavedDesigns((prev) => [newDesign, ...prev])
  }

  const handleDeleteDesign = (id: string) => {
    setSavedDesigns((prev) => prev.filter((d) => d.id !== id))
    if (selectedDesign?.id === id) {
      setSelectedDesign(null)
    }
  }

  const handleDownload = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename ?? `design_${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const filteredDesigns = savedDesigns.filter((design) =>
    design.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stylePresets = [
    { label: 'Minimal', prompt: 'Create a minimal design with clean lines and plenty of white space' },
    { label: 'Bold', prompt: 'Create a bold, eye-catching design with vibrant colors and strong typography' },
    { label: 'Vintage', prompt: 'Create a vintage-style design with retro colors and classic elements' },
  ]

  return (
    <div style={THEME_VARS} className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r border-border flex flex-col backdrop-blur-md bg-opacity-75">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2 mb-1">
              <HiSparkles className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">Design Studio</h1>
            </div>
            <p className="text-xs text-muted-foreground">AI-Powered Graphics</p>
          </div>

          <nav className="flex-1 p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-1 gap-2 bg-transparent">
                <TabsTrigger
                  value="studio"
                  className="justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                >
                  <HiSparkles className="h-4 w-4" />
                  Create
                </TabsTrigger>
                <TabsTrigger
                  value="library"
                  className="justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                >
                  <FiImage className="h-4 w-4" />
                  Library
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </nav>

          <div className="p-4 border-t border-border">
            <Card className="bg-muted/50 border-border/50">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Agent:</strong> Graphic Design Agent
                </p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  {loading ? 'Generating...' : 'Ready'}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'studio' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-border bg-card/50 backdrop-blur-md">
                <h2 className="text-2xl font-bold tracking-tight mb-1">Design Studio</h2>
                <p className="text-sm text-muted-foreground">
                  Describe your design and let AI bring it to life
                </p>
              </div>

              {/* Chat Area */}
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-12">
                      <HiSparkles className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">Start Creating</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Describe your design idea with details like colors, style, dimensions, and text
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {stylePresets.map((preset) => (
                          <Button
                            key={preset.label}
                            variant="outline"
                            size="sm"
                            onClick={() => setPrompt(preset.prompt)}
                            className="border-border hover:bg-muted transition-all duration-300"
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatHistory.map((message, idx) => (
                    <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.role === 'user' ? (
                        <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-3 max-w-2xl shadow-sm">
                          <p className="text-sm">{message.content}</p>
                        </div>
                      ) : (
                        <Card className="max-w-3xl w-full bg-card/80 backdrop-blur-sm border-border/50 shadow-lg">
                          <CardContent className="p-6 space-y-4">
                            {message.imageUrl && !imageError[message.imageUrl] && (
                              <div className="rounded-lg overflow-hidden border border-border shadow-md">
                                <img
                                  src={message.imageUrl}
                                  alt="Generated design"
                                  className="w-full h-auto object-contain max-h-[500px]"
                                  onError={() => setImageError((prev) => ({ ...prev, [message.imageUrl!]: true }))}
                                />
                              </div>
                            )}

                            {message.imageUrl && imageError[message.imageUrl] && (
                              <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
                                <FiImage className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Image failed to load</p>
                              </div>
                            )}

                            <div className="prose prose-sm max-w-none">
                              {renderMarkdown(message.content)}
                            </div>

                            {message.specs && (
                              <div className="space-y-3 pt-3 border-t border-border/50">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Design Specifications
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  {message.specs.brand_name && (
                                    <div>
                                      <span className="text-muted-foreground">Brand:</span>{' '}
                                      <span className="font-medium">{message.specs.brand_name}</span>
                                    </div>
                                  )}
                                  {message.specs.dimensions && (
                                    <div>
                                      <span className="text-muted-foreground">Size:</span>{' '}
                                      <span className="font-medium">{message.specs.dimensions}</span>
                                    </div>
                                  )}
                                  {message.specs.platform && (
                                    <div>
                                      <span className="text-muted-foreground">Platform:</span>{' '}
                                      <span className="font-medium">{message.specs.platform}</span>
                                    </div>
                                  )}
                                  {message.specs.style && (
                                    <div>
                                      <span className="text-muted-foreground">Style:</span>{' '}
                                      <span className="font-medium">{message.specs.style}</span>
                                    </div>
                                  )}
                                </div>

                                {Array.isArray(message.specs.colors) && message.specs.colors.length > 0 && (
                                  <div>
                                    <span className="text-xs text-muted-foreground block mb-1">Colors:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {message.specs.colors.map((color: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                          {color}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {Array.isArray(message.specs.geometric_elements) &&
                                  message.specs.geometric_elements.length > 0 && (
                                    <div>
                                      <span className="text-xs text-muted-foreground block mb-1">Elements:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {message.specs.geometric_elements.map((element: string, i: number) => (
                                          <Badge key={i} variant="outline" className="text-xs">
                                            {element}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            )}

                            {message.imageUrl && (
                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleDownload(message.imageUrl!, 'design.png')}
                                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300"
                                >
                                  <FiDownload className="h-4 w-4" />
                                  Download
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSaveDesign(message)}
                                  className="gap-2 border-border hover:bg-muted transition-all duration-300"
                                >
                                  <FiImage className="h-4 w-4" />
                                  Save to Library
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <Card className="max-w-3xl w-full bg-card/80 backdrop-blur-sm border-border/50">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />
                            <p className="text-sm text-muted-foreground">Creating your design...</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-6 border-t border-border bg-card/50 backdrop-blur-md">
                <div className="max-w-4xl mx-auto">
                  <div className="flex gap-3">
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleGenerate()
                        }
                      }}
                      placeholder="Describe your design... (e.g., Create a modern Instagram post for a coffee shop with warm brown tones, minimalist style, 1080x1080px)"
                      className="flex-1 min-h-[80px] resize-none bg-background border-input focus:ring-2 focus:ring-ring transition-all duration-300"
                      disabled={loading}
                    />
                    <Button
                      onClick={handleGenerate}
                      disabled={!prompt.trim() || loading}
                      className="px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <FiSend className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to generate, Shift+Enter for new line
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'library' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-border bg-card/50 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-1">Asset Library</h2>
                    <p className="text-sm text-muted-foreground">Browse and manage your saved designs</p>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {savedDesigns.length} {savedDesigns.length === 1 ? 'design' : 'designs'}
                  </Badge>
                </div>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search designs..."
                      className="pl-9 bg-background border-input focus:ring-2 focus:ring-ring transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* Gallery */}
              <ScrollArea className="flex-1 p-6">
                {filteredDesigns.length === 0 && (
                  <div className="text-center py-12">
                    <FiImage className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">
                      {savedDesigns.length === 0 ? 'No Saved Designs' : 'No Results Found'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {savedDesigns.length === 0
                        ? 'Create designs in the studio and save them here'
                        : 'Try a different search term'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                  {filteredDesigns.map((design) => (
                    <Card
                      key={design.id}
                      className="group cursor-pointer hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden"
                      onClick={() => setSelectedDesign(design)}
                    >
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        {!imageError[design.imageUrl] ? (
                          <img
                            src={design.imageUrl}
                            alt="Design preview"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={() => setImageError((prev) => ({ ...prev, [design.imageUrl]: true }))}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FiImage className="h-12 w-12 text-muted-foreground opacity-50" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <p className="text-sm line-clamp-2 mb-2">{design.prompt}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(design.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Design Detail Modal */}
      <Dialog open={!!selectedDesign} onOpenChange={() => setSelectedDesign(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Design Details</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {selectedDesign &&
                new Date(selectedDesign.timestamp).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                })}
            </DialogDescription>
          </DialogHeader>

          {selectedDesign && (
            <div className="space-y-6">
              <div className="rounded-lg overflow-hidden border border-border shadow-md">
                {!imageError[selectedDesign.imageUrl] ? (
                  <img
                    src={selectedDesign.imageUrl}
                    alt="Full design"
                    className="w-full h-auto object-contain max-h-[500px]"
                    onError={() =>
                      setImageError((prev) => ({ ...prev, [selectedDesign.imageUrl]: true }))
                    }
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center bg-muted">
                    <FiImage className="h-16 w-16 text-muted-foreground opacity-50" />
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Original Prompt</h4>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                  {selectedDesign.prompt}
                </p>
              </div>

              {selectedDesign.explanation && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Design Details</h4>
                  <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                    {renderMarkdown(selectedDesign.explanation)}
                  </div>
                </div>
              )}

              {selectedDesign.specs && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-semibold">Specifications</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedDesign.specs.brand_name && (
                      <div>
                        <span className="text-muted-foreground">Brand:</span>{' '}
                        <span className="font-medium">{selectedDesign.specs.brand_name}</span>
                      </div>
                    )}
                    {selectedDesign.specs.dimensions && (
                      <div>
                        <span className="text-muted-foreground">Size:</span>{' '}
                        <span className="font-medium">{selectedDesign.specs.dimensions}</span>
                      </div>
                    )}
                    {selectedDesign.specs.platform && (
                      <div>
                        <span className="text-muted-foreground">Platform:</span>{' '}
                        <span className="font-medium">{selectedDesign.specs.platform}</span>
                      </div>
                    )}
                    {selectedDesign.specs.style && (
                      <div>
                        <span className="text-muted-foreground">Style:</span>{' '}
                        <span className="font-medium">{selectedDesign.specs.style}</span>
                      </div>
                    )}
                  </div>

                  {Array.isArray(selectedDesign.specs.colors) && selectedDesign.specs.colors.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">Colors:</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedDesign.specs.colors.map((color: string, i: number) => (
                          <Badge key={i} variant="secondary">
                            {color}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(selectedDesign.specs.geometric_elements) &&
                    selectedDesign.specs.geometric_elements.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground block mb-2">Elements:</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedDesign.specs.geometric_elements.map((element: string, i: number) => (
                            <Badge key={i} variant="outline">
                              {element}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {Array.isArray(selectedDesign.specs.logo_placement) &&
                    selectedDesign.specs.logo_placement.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground block mb-2">Logo Placement:</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedDesign.specs.logo_placement.map((position: string, i: number) => (
                            <Badge key={i} variant="outline">
                              {position}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={() => handleDownload(selectedDesign.imageUrl, `${selectedDesign.id}.png`)}
                  className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300"
                >
                  <FiDownload className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPrompt(selectedDesign.prompt)
                    setActiveTab('studio')
                    setSelectedDesign(null)
                  }}
                  className="flex-1 gap-2 border-border hover:bg-muted transition-all duration-300"
                >
                  <HiSparkles className="h-4 w-4" />
                  Recreate
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteDesign(selectedDesign.id)}
                  className="gap-2 transition-all duration-300"
                >
                  <FiTrash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
