/**
 * Memory Playground Page
 * Interactive Memory API testing interface
 */
import { useState, useEffect } from 'react'
import { PageHeader } from '@memokit/ui/composed'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Alert,
  AlertDescription,
  Button,
  Textarea,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@memokit/ui/primitives'
import { AlertTriangle, Send, Search, Plus, Key } from 'lucide-react'
import { useApiKeys } from '@/features/api-keys'

interface Memory {
  id: string
  content: string
  userId: string
  agentId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
  tags?: string[]
  createdAt: string
}

interface SearchResult extends Memory {
  similarity: number
}

export default function MemoryPlaygroundPage() {
  const { data: apiKeys, isLoading: keysLoading } = useApiKeys()
  const [selectedKeyId, setSelectedKeyId] = useState<string>('')
  const [manualApiKey, setManualApiKey] = useState<string>('')

  // Add Memory state
  const [addContent, setAddContent] = useState('')
  const [addUserId, setAddUserId] = useState('test-user')
  const [addAgentId, setAddAgentId] = useState('')
  const [addTags, setAddTags] = useState('')
  const [addResult, setAddResult] = useState<Memory | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchUserId, setSearchUserId] = useState('test-user')
  const [searchLimit, setSearchLimit] = useState('10')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // Auto-select first API key
  useEffect(() => {
    if (apiKeys?.length && !selectedKeyId) {
      const firstActiveKey = apiKeys.find((k) => k.isActive) || apiKeys[0]
      setSelectedKeyId(firstActiveKey.id)
    }
  }, [apiKeys, selectedKeyId])

  const getApiKey = () => {
    return manualApiKey
  }

  const handleAddMemory = async () => {
    if (!addContent.trim() || !manualApiKey.trim()) return

    setAddLoading(true)
    setAddError(null)
    setAddResult(null)

    try {
      const response = await fetch('/api/v1/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
          content: addContent,
          userId: addUserId,
          agentId: addAgentId || undefined,
          tags: addTags ? addTags.split(',').map(t => t.trim()) : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add memory')
      }

      setAddResult(data.data)
      setAddContent('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add memory')
    } finally {
      setAddLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !manualApiKey.trim()) return

    setSearchLoading(true)
    setSearchError(null)
    setSearchResults([])

    try {
      const response = await fetch('/api/v1/memories/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          userId: searchUserId,
          limit: parseInt(searchLimit),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to search memories')
      }

      setSearchResults(data.data || [])
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to search memories')
    } finally {
      setSearchLoading(false)
    }
  }

  if (keysLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Memory Playground"
          description="Interactive Memory API testing"
        />
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!apiKeys?.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Memory Playground"
          description="Interactive Memory API testing"
        />
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You haven't created any API Keys yet. Please create one on the{' '}
            <a
              href="/api-keys"
              className="underline font-medium text-primary"
            >
              API Keys page
            </a>{' '}
            first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory Playground"
        description="Test the Memory API interactively - add, search, and manage semantic memories"
      />

      {/* API Key Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="api-key-input" className="whitespace-nowrap">
                <Key className="h-4 w-4 inline mr-2" />
                API Key
              </Label>
              <Input
                id="api-key-input"
                type="password"
                placeholder="输入你的 API Key (mk_...)"
                value={manualApiKey}
                onChange={(e) => setManualApiKey(e.target.value)}
                className="flex-1 font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              API Key 在创建时只显示一次。如需新 Key，请在{' '}
              <a href="/api-keys" className="underline text-primary">API Keys 页面</a> 创建。
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="add" className="space-y-4">
        <TabsList>
          <TabsTrigger value="add">
            <Plus className="h-4 w-4 mr-2" />
            Add Memory
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            Search Memories
          </TabsTrigger>
        </TabsList>

        {/* Add Memory Tab */}
        <TabsContent value="add">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Memory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">Memory Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Enter the memory content..."
                    value={addContent}
                    onChange={(e) => setAddContent(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      placeholder="user-123"
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agentId">Agent ID (optional)</Label>
                    <Input
                      id="agentId"
                      placeholder="agent-1"
                      value={addAgentId}
                      onChange={(e) => setAddAgentId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="work, project, idea"
                    value={addTags}
                    onChange={(e) => setAddTags(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleAddMemory}
                  disabled={addLoading || !addContent.trim() || !manualApiKey.trim()}
                  className="w-full"
                >
                  {addLoading ? 'Adding...' : 'Add Memory'}
                  <Send className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                {addError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{addError}</AlertDescription>
                  </Alert>
                ) : addResult ? (
                  <div className="space-y-2">
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm font-medium mb-2">Memory Created</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        ID: {addResult.id}
                      </p>
                      <p className="text-sm">{addResult.content}</p>
                      {addResult.tags && addResult.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {addResult.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <pre className="text-xs p-4 rounded-lg bg-muted overflow-auto max-h-[300px]">
                      {JSON.stringify(addResult, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Add a memory to see the result here
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Search Memories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="searchQuery">Search Query</Label>
                  <Textarea
                    id="searchQuery"
                    placeholder="What are you looking for?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="searchUserId">User ID</Label>
                    <Input
                      id="searchUserId"
                      placeholder="user-123"
                      value={searchUserId}
                      onChange={(e) => setSearchUserId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="searchLimit">Limit</Label>
                    <Input
                      id="searchLimit"
                      type="number"
                      placeholder="10"
                      value={searchLimit}
                      onChange={(e) => setSearchLimit(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={searchLoading || !searchQuery.trim() || !manualApiKey.trim()}
                  className="w-full"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                  <Search className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Results ({searchResults.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {searchError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{searchError}</AlertDescription>
                  </Alert>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-auto">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-muted-foreground">
                            {result.id.slice(0, 8)}...
                          </span>
                          <span className="text-xs font-medium text-primary">
                            {(result.similarity * 100).toFixed(1)}% match
                          </span>
                        </div>
                        <p className="text-sm">{result.content}</p>
                        {result.tags && result.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {result.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded-full bg-muted"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Search for memories to see results here
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
