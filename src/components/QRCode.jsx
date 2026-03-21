import { QRCodeSVG } from 'qrcode.react'

export default function QRCode({ value, size = 200 }) {
  return (
    <div className="bg-white p-4 rounded-xl inline-block shadow-lg">
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        includeMargin={true}
      />
    </div>
  )
}
