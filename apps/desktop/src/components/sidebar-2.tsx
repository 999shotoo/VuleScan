"use client"

import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ArchiveX, Command, File, Inbox, Send, Trash2, Plus, MoreHorizontal, Pencil } from "lucide-react"
import { getAllChats, createNewChat, updateChatTitle, deleteChat, ChatSession } from "../lib/chat-storage"
import { cn } from "../lib/utils"

// import { NavUser } from "@/components/nav-user"
import { Label } from "./ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar"
import { Switch } from "./ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

// This is sample data
const data = {
  navMain: [
    {
      title: "Chat",
      url: "/chat",
      icon: Inbox,
      isActive: false,
    },
    {
      title: "Drafts",
      url: "/drafts",
      icon: File,
      isActive: false,
    },
    {
      title: "Sent",
      url: "/sent",
      icon: Send,
      isActive: false,
    },
    {
      title: "Junk",
      url: "/junk",
      icon: ArchiveX,
      isActive: false,
    },
    {
      title: "Trash",
      url: "/trash",
      icon: Trash2,
      isActive: false,
    },
  ],
  contentData: {
    Chat: [
      {
        name: "AI Assistant",
        time: "Just now",
        preview: "How can I help you with vulnerability scanning today?",
      },
      {
        name: "Security Team",
        time: "5 min ago",
        preview: "New scan results are ready for review.",
      },
      { 
        name: "System Notifications",
        time: "1 hour ago",
        preview: "Weekly security report generated successfully.",
      },
      {
        name: "John Doe",
        time: "2 hours ago",
        preview: "Can you run a scan on the production server?",
      },
      {
        name: "Alert System",
        time: "Yesterday",
        preview: "3 new vulnerabilities detected in network scan.",
      },
    ],
    Drafts: [
      {
        name: "Scan Configuration",
        time: "2 days ago",
        preview: "Draft: Network scan settings for internal infrastructure...",
      },
      {
        name: "Security Report",
        time: "3 days ago",
        preview: "Draft: Monthly vulnerability assessment summary...",
      },
      {
        name: "Team Update",
        time: "1 week ago",
        preview: "Draft: New scanning protocols and procedures...",
      },
    ],
    Sent: [
      {
        name: "Security Report - Week 6",
        time: "Yesterday",
        preview: "Completed scan report sent to security team.",
      },
      {
        name: "Vulnerability Alert",
        time: "2 days ago",
        preview: "Critical vulnerabilities found - immediate action required.",
      },
      {
        name: "Scan Results",
        time: "3 days ago",
        preview: "Latest network scan completed with 15 findings.",
      },
      {
        name: "Monthly Summary",
        time: "1 week ago",
        preview: "January security scanning summary and statistics.",
      },
    ],
    Junk: [
      {
        name: "Unknown Sender",
        time: "Today",
        preview: "Suspicious activity detected - marked as spam.",
      },
      {
        name: "Marketing Bot",
        time: "Yesterday",
        preview: "Limited time offer on security tools...",
      },
      {
        name: "Phishing Attempt",
        time: "2 days ago",
        preview: "Verify your account credentials immediately...",
      },
    ],
    Trash: [
      {
        name: "Old Scan Data",
        time: "1 week ago",
        preview: "Archived scan results from previous quarter.",
      },
      {
        name: "Deleted Report",
        time: "2 weeks ago",
        preview: "Obsolete vulnerability report - no longer relevant.",
      },
      {
        name: "Test Messages",
        time: "1 month ago",
        preview: "System test messages and debugging logs.",
      },
    ],
  },
}

export function AppSidebar({ className, style, ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate()
  const location = useLocation()
  const { setOpen } = useSidebar()
  const [chats, setChats] = React.useState<ChatSession[]>([])
  const [renamingChat, setRenamingChat] = React.useState<ChatSession | null>(null)
  const [renameTitle, setRenameTitle] = React.useState("")
  const [deletingChat, setDeletingChat] = React.useState<ChatSession | null>(null)
  const [hoveredChatId, setHoveredChatId] = React.useState<string | null>(null)
  const [openActionChatId, setOpenActionChatId] = React.useState<string | null>(null)

  // Load chats from localStorage
  React.useEffect(() => {
    const loadChats = () => {
      const allChats = getAllChats()
      setChats(allChats)
    }
    loadChats()

    // Reload chats when the window gains focus (in case they were updated)
    window.addEventListener('focus', loadChats)
    return () => window.removeEventListener('focus', loadChats)
  }, [location.pathname])

  const handleNewChat = () => {
    const newChat = createNewChat()
    setChats([newChat, ...chats])
    navigate(`/chat/${newChat.id}`)
    setOpen(true)
  }

  const activeChatId = React.useMemo(() => {
    const match = location.pathname.match(/^\/chat\/([^/]+)$/)
    return match?.[1] ?? null
  }, [location.pathname])

  const startRename = (chat: ChatSession) => {
    setRenamingChat(chat)
    setRenameTitle(chat.title)
  }

  const commitRename = () => {
    if (!renamingChat) {
      return
    }

    const chatId = renamingChat.id
    const nextTitle = renameTitle.trim()
    if (!nextTitle) {
      setRenamingChat(null)
      setRenameTitle("")
      return
    }

    setChats((prev) => {
      const target = prev.find((chat) => chat.id === chatId)
      if (!target || target.title === nextTitle) {
        return prev
      }

      updateChatTitle(chatId, nextTitle)
      return prev.map((chat) =>
        chat.id === chatId
          ? { ...chat, title: nextTitle, updatedAt: Date.now() }
          : chat
      )
    })

    setRenamingChat(null)
    setRenameTitle("")
  }

  const confirmDeleteChat = () => {
    if (!deletingChat) {
      return
    }

    const deletingId = deletingChat.id
    deleteChat(deletingId)

    setChats((prev) => {
      const remaining = prev.filter((chat) => chat.id !== deletingId)
      if (activeChatId === deletingId) {
        if (remaining.length > 0) {
          navigate(`/chat/${remaining[0].id}`)
        } else {
          navigate('/chat')
        }
      }
      return remaining
    })

    if (renamingChat?.id === deletingId) {
      setRenamingChat(null)
      setRenameTitle("")
    }

    setDeletingChat(null)
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  // Determine active item based on current route
  const activeItem = React.useMemo(
    () => data.navMain.find((item) => item.url === location.pathname) || data.navMain[0],
    [location.pathname]
  )

  const isChatHomeRoute = location.pathname === '/chat'
  const isChatSessionRoute = /^\/chat\/[^/]+$/.test(location.pathname)
  const shouldShowSecondarySidebar =
    isChatHomeRoute ||
    isChatSessionRoute ||
    location.pathname === '/drafts' ||
    location.pathname === '/sent' ||
    location.pathname === '/junk' ||
    location.pathname === '/trash'
  const showNewChatButton = activeItem.title === 'Chat' && isChatSessionRoute

  const iconRail = (
    <Sidebar
      collapsible="none"
      className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="md:h-8 md:p-0">
              <a href="#" className="flex items-center w-full">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-1.5 md:px-0">
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={{
                      children: item.title,
                      hidden: false,
                    }}
                    onClick={() => {
                      navigate(item.url)
                      setOpen(true)
                    }}
                    isActive={activeItem.title === item.title}
                    className="px-2.5 md:px-2"
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {/* <NavUser user={data.user} /> */}
      </SidebarFooter>
    </Sidebar>
  )

  if (!shouldShowSecondarySidebar) {
    return (
      <Sidebar
        {...props}
        collapsible="none"
        className={cn("overflow-hidden *:data-[sidebar=sidebar]:flex-row", className)}
        style={{
          ...(style as React.CSSProperties),
          "--sidebar-width": "calc(var(--sidebar-width-icon) + 1px)",
        } as React.CSSProperties}
      >
        {iconRail}
      </Sidebar>
    )
  }

  return (
    <Sidebar
      {...props}
      collapsible="icon"
      className={cn("overflow-hidden *:data-[sidebar=sidebar]:flex-row", className)}
      style={style}
    >
      {iconRail}

      {/* This is the second sidebar */}
      {/* Keep mounted and animate width/opacity for smooth route transitions. */}
      <div
        data-sidebar="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground hidden min-w-0 flex-1 flex-col overflow-hidden transition-opacity duration-200 ease-out md:flex md:opacity-100"
        )}
      >
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeItem?.title}
            </div>
            {showNewChatButton && (
              <button
                onClick={handleNewChat}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          <SidebarInput placeholder="Search chats..." />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {activeItem.title === 'Chat' ? (
                chats.length > 0 ? (
                  chats.map((chat) => (
                    <div
                      key={chat.id}
                      className="group border-b last:border-b-0 transition-colors duration-150"
                      onMouseEnter={() => setHoveredChatId(chat.id)}
                      onMouseLeave={() => setHoveredChatId((prev) => (prev === chat.id ? null : prev))}
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_4rem] items-start gap-1 p-3 hover:bg-sidebar-accent/70">
                        <button
                          onClick={() => {
                            navigate(`/chat/${chat.id}`)
                            setOpen(false)
                          }}
                          className="flex w-full flex-col items-start gap-2 min-w-0 text-sm leading-tight text-left overflow-hidden"
                        >
                          <div className="w-full min-w-0 overflow-hidden">
                            <span className="block max-w-full font-medium truncate">{chat.title}</span>
                          </div>
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {chat.messages.length > 0
                              ? `${chat.messages.length} message${chat.messages.length !== 1 ? 's' : ''}`
                              : 'No messages yet'}
                          </span>
                        </button>

                        <div className="flex w-16 shrink-0 flex-col items-end gap-1 pt-0.5">
                          <span className="w-full truncate text-right text-[11px] text-muted-foreground leading-none">
                            {formatTimestamp(chat.updatedAt)}
                          </span>

                          <DropdownMenu
                            onOpenChange={(open) => {
                              setOpenActionChatId(open ? chat.id : null)
                            }}
                          >
                            <DropdownMenuTrigger
                              render={
                                <button
                                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-accent-foreground ${
                                    hoveredChatId === chat.id || openActionChatId === chat.id
                                      ? 'opacity-100 pointer-events-auto'
                                      : 'opacity-0 pointer-events-none'
                                  }`}
                                  aria-label="Chat actions"
                                />
                              }
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={6} className="w-36">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startRename(chat)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletingChat(chat)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <p>No chats yet</p>
                    <p className="text-xs mt-1">Click + to start a new chat</p>
                  </div>
                )
              ) : (
                activeItem && data.contentData[activeItem.title as keyof typeof data.contentData]?.map((item, index) => (
                  <a
                    href="#"
                    key={index}
                    className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight last:border-b-0 overflow-hidden"
                  >
                    <div className="w-full grid grid-cols-[1fr_auto] items-center gap-2">
                      <span className="font-medium min-w-0 truncate">{item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                    </div>
                    <span className="text-xs text-muted-foreground line-clamp-2">
                      {item.preview}
                    </span>
                  </a>
                ))
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </div>

      <Dialog open={Boolean(deletingChat)} onOpenChange={(open) => !open && setDeletingChat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
            <DialogDescription>
              {deletingChat
                ? `This will permanently remove "${deletingChat.title}" from your history.`
                : 'This will permanently remove the selected chat from your history.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingChat(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteChat}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(renamingChat)}
        onOpenChange={(open) => {
          if (!open) {
            setRenamingChat(null)
            setRenameTitle("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>
              Choose a new name for this conversation.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              commitRename()
            }}
            className="space-y-3"
          >
            <Input
              autoFocus
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              placeholder="Enter chat title"
              maxLength={80}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRenamingChat(null)
                  setRenameTitle("")
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
