import { useState, useEffect, useRef } from "react"
import { Users } from "lucide-react"
import PassengerDropdown, { PassengerCount } from "./PassengerDropdown"

const initialCount: PassengerCount = {
  adult: 1,
  child: 0,
  student: 0,
  elderly: 0,
}

export default function PassengerSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [count, setCount] = useState<PassengerCount>(initialCount)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Click outside → đóng dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const total = count.adult + count.child + count.student + count.elderly

  function formatLabel() {
    const parts = []
    if (count.adult > 0) parts.push(`👤 ${count.adult} Người lớn`)
    if (count.child > 0) parts.push(`👶 ${count.child} Trẻ em`)
    if (count.student > 0) parts.push(`🎓 ${count.student} Sinh viên`)
    if (count.elderly > 0) parts.push(`👴 ${count.elderly} Người cao tuổi`)
    return parts.length > 0 ? parts.join(" · ") : "Chọn hành khách"
  }

  return (
    <div className="passenger-selector-wrap" ref={wrapperRef}>
      {/* Trigger — click để mở dropdown */}
      <div
        className={`passenger-field${isOpen ? " passenger-field-active" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Users size={18} className="icon-muted" />
        <div className="passenger-field-content">
          <div className="passenger-field-total">
            {total} Hành khách
          </div>
          <div className="passenger-field-breakdown">{formatLabel()}</div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="passenger-dropdown-anchor">
          <PassengerDropdown
            count={count}
            onChange={setCount}
            onConfirm={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
