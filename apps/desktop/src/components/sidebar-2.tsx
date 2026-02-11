"use client"

import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ArchiveX, Command, File, Inbox, Send, Trash2, Plus } from "lucide-react"
import { getAllChats, createNewChat } from "../lib/chat-storage"

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate()
  const location = useLocation()
  const { setOpen } = useSidebar()
  const [chats, setChats] = React.useState<any[]>([])

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

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* This is the first sidebar */}
      {/* We disable collapsible and adjust width to icon. */}
      {/* This will make the sidebar appear as icons. */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="#">
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

      {/* This is the second sidebar */}
      {/* We disable collapsible and let it fill remaining space */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeItem?.title}
            </div>
            <button
              onClick={handleNewChat}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <SidebarInput placeholder="Search chats..." />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {activeItem.title === 'Chat' ? (
                chats.length > 0 ? (
                  chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        navigate(`/chat/${chat.id}`)
                        setOpen(false)
                      }}
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight last:border-b-0 w-full text-left"
                    >
                      <div className="flex w-full items-center gap-2">
                        <span className="font-medium truncate">{chat.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(chat.updatedAt)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {chat.messages.length > 0 
                          ? `${chat.messages.length} message${chat.messages.length !== 1 ? 's' : ''}`
                          : 'No messages yet'}
                      </span>
                    </button>
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
                    className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight last:border-b-0"
                  >
                    <div className="flex w-full items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{item.time}</span>
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
      </Sidebar>
    </Sidebar>
  )
}
