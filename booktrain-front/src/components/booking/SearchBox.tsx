import { useState } from "react"
import { Bus, Plane, Train, Car } from "lucide-react"
import FormTrain from "./FormTrain"
import FormBus from "./FormBus"
import FormFlight from "./FormFlight"
import type { LocationDTO } from "../../types/location"

type TabId = "bus" | "plane" | "train" | "car"

interface Tab {
  id: TabId
  label: string
  icon: React.ComponentType<{ size?: number }>
  badge?: string
}

const tabs: Tab[] = [
  { id: "bus",   label: "Xe khách", icon: Bus },
  { id: "plane", label: "Máy bay",  icon: Plane, badge: "-30k" },
  { id: "train", label: "Tàu hỏa",  icon: Train, badge: "-25%" },
  { id: "car",   label: "Thuê xe",  icon: Car,   badge: "Mới" },
]

interface SearchBoxProps {
  defaultTab?: TabId
  initialOrigin?: LocationDTO | null      
  initialDestination?: LocationDTO | null 
  initialDate?: string                    
}

export default function SearchBox({ 
  defaultTab = "train",
  initialOrigin,        
  initialDestination,   
  initialDate,          
}: SearchBoxProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  function renderForm(tabId: TabId) {
    switch (tabId) {
      case "train": return (
        <FormTrain
          initialDeparture={initialOrigin}        
          initialDestination={initialDestination}
          initialDate={initialDate}
        />
      )
      case "bus":   return <FormBus />
      case "plane": return <FormFlight />
      default:      return null
    }
  }

  return (
    <div className="search-box">
      <div className="tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              className={`tab-item${activeTab === tab.id ? " active" : ""}${tab.id === "car" ? " tab-disabled" : ""}`}
              onClick={() => tab.id !== "car" && setActiveTab(tab.id)}
              disabled={tab.id === "car"}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge && <span className="badge">{tab.badge}</span>}
            </button>
          )
        })}
      </div>
      {renderForm(activeTab)}
    </div>
  )
}