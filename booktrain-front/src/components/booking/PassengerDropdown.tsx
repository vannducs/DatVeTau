import { Minus, Plus } from "lucide-react"

export interface PassengerCount {
  adult: number
  child: number
  elderly: number
}

interface PassengerDropdownProps {
  count: PassengerCount
  onChange: (count: PassengerCount) => void
  onConfirm: () => void
}

const passengerTypes: {
  key: keyof Omit<PassengerCount, never>
  label: string
  emoji: string
  min: number
}[] = [
  { key: "adult", label: "Người lớn", emoji: "👤", min: 1 },
  { key: "child", label: "Trẻ em", emoji: "👶", min: 0 },
  { key: "elderly", label: "Người cao tuổi", emoji: "👴", min: 0 },
]

export default function PassengerDropdown({
  count,
  onChange,
  onConfirm,
}: PassengerDropdownProps) {
  function handleDecrease(key: keyof PassengerCount, min: number) {
    if (count[key] > min) {
      onChange({ ...count, [key]: count[key] - 1 })
    }
  }

  function handleIncrease(key: keyof PassengerCount) {
    onChange({ ...count, [key]: count[key] + 1 })
  }

  return (
    <div className="passenger-dropdown">
      {passengerTypes.map(({ key, label, emoji, min }) => (
        <div key={key} className="passenger-row-item">
          <div className="passenger-row-left">
            <span className="passenger-emoji">{emoji}</span>
            <span className="passenger-label">{label}</span>
          </div>
          <div className="passenger-counter">
            <button
              type="button"
              className="counter-btn"
              onClick={() => handleDecrease(key, min)}
              disabled={count[key] <= min}
              aria-label={`Giảm ${label}`}
            >
              <Minus size={12} />
            </button>
            <span className="counter-value">{count[key]}</span>
            <button
              type="button"
              className="counter-btn counter-btn-plus"
              onClick={() => handleIncrease(key)}
              aria-label={`Tăng ${label}`}
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      ))}

      <div className="passenger-dropdown-footer">
        <button type="button" className="confirm-btn" onClick={onConfirm}>
          Xác nhận
        </button>
      </div>
    </div>
  )
}
