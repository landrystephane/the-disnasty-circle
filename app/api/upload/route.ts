import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // On Vercel (serverless environment without persistent disk), return data URL
    if (process.env.VERCEL) {
      const mime = file.type || 'image/jpeg'
      const base64 = buffer.toString('base64')
      const dataUrl = `data:${mime};base64,${base64}`
      return NextResponse.json({ success: true, url: dataUrl })
    }

    // Sanitize extension
    const originalName = file.name || 'flyer.jpg'
    const ext = path.extname(originalName) || '.jpg'
    const fileName = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`

    // Target upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const publicUrl = `/uploads/${fileName}`

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement de l\'affiche.' }, { status: 500 })
  }
}
