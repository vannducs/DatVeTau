import { useState } from "react"
import { Bus, Plane, Train, Car } from "lucide-react"
import "./searchSection.css"
import FormTrain from "./FormTrain"
import FormBus from "./FormBus"
import FormFlight from "./FormFlight"

type TabId = "bus" | "plane" | "train" | "car"

interface Tab {
  id: TabId
  label: string
  icon: React.ComponentType<{ size?: number }>
  badge?: string
}

const tabs: Tab[] = [
  { id: "bus", label: "Xe khách", icon: Bus },
  { id: "plane", label: "Máy bay", icon: Plane, badge: "-30k" },
  { id: "train", label: "Tàu hỏa", icon: Train, badge: "-25%" },
  { id: "car", label: "Thuê xe", icon: Car, badge: "Mới" },
]

function renderForm(tabId: TabId) {
  switch (tabId) {
    case "train":
      return <FormTrain />
    case "bus":
      return <FormBus />
    case "plane":
      return <FormFlight />
    default:
      return null
  }
}

export default function SearchSection() {
  const [activeTab, setActiveTab] = useState<TabId>("train")

  return (
    <div className="search-section">
      <div className="overlay">
        <h1>Đặt Vé Tàu Hỏa Online</h1>
        <p>⭐ Đại lý chính thức Đường Sắt Việt Nam</p>

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
      </div>
    </div>
  )
}
