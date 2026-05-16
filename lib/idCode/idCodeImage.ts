/** Commented by Desmond @ 14-May-26
 * @file lib/idCode/idCodeImage.ts
 * @description Unified image generation for barcode (assets) and QR codes (locations & departments)
 * 
 * Commented by Desmond @ 16-May-26: LATEST FIXES
 *  Issue A - Garbled text and tofu characters in the generated PNGs
 *      This is because 'canvas' was marked as optional in package.json so that Vercel's
 *      build did not fail trying to compile the native .node binary. When the optional
 *      import resolved to 'undefined' at runtime, 'createCanvas' was undefined, the
 *      code silently fell back to bwip-js's internal canvas shim, which does not support
 *      fillText with system fonts, therefore causing the square-block characters.
 * 
 * To fix this:
 *      'canvas' is now a regular dependency (not optional) AND is declared as a
 *      serverExternalPackage in the next.config.js file so the Vercel bundler never
 *      tries to bundle the native binary, because it is required at runtime from the 
 *      installed node_modules instead. The dynamic import below is wrapped in a 
 *      hard-fail guard. So, if 'createCanvas' is still undefined after the import,
 *      immediately throw a clear message rather than silently producing broken QR codes.
 * 
 *  1.  The image saved to Supabase is what the preview shows to the user
 *      Previously, the server only stored a bare QR PNG with no surrounding text.
 *      The client preview rendered the header/footer in HTML/CSS around the image for the Swinburne text.
 *      This caused mismatches when printing or saving via idCodeModal.
 * 
 *  2.  All the text is embedded in the PNG
 *      'SWINBURNE UNIVERSITY OF TECHNOLOGY' header, the scan URL, the entity label are drawn onto the
 *      canvas before saving and not added as a HTML wrapper. This makes the PNG self-contained for 
 *      printing and saving.
 * 
 *  3.  BASE_URL priority
 *      NEXT_PUBLIC_APP_URL over NEXTAUTH_URL
 *      NEXTAUTH_URL is https://localhost:3000 in dev, which caused QR codes stored in the bucket to contain
 *      localhost URLs instead of the production URL. NEXT_PUBLIC_APP_URL should be set to https://swinburne-
 *      -assets.vercel.app in all environments (including dev to maintain production-style QRs)
 * 
 *  4.  QR colour is #000000 (pure black) for maximum scan reliability.
 *      bwip-js barcode already uses #111827. Both are near black; pure black is safer for low-quality
 *      printers and aged papers.
 * 
 * Canvas layout
 * -------------
 * QR code sticker (location / department):
 *      ______________________________________
 *      | SWINBURNE UNIVERSITY OF TECHNOLOGY |  - 13px bold, black text on white bg
 *      | Location: E404                     |  - 11px, draw grey on white  
 *      |                                    |
 *      |             [QR CODE]              |  - 240x240 px QR
 *      |                                    |
 *      | https://.../scan/location/E404     |  - 8px monospace scan URL
 *      | IOT LAB                            |  - 11px bold location/dept name if provided
 *      ______________________________________
 * 
 * Barcode sticker (asset):
 *      ______________________________________
 *      | SWINBURNE UNIVERSITY OF TECHNOLOGY |  - 12px bold, black texts on white bg
 *      |                                    |
 *      | [=========== BARCODE ============] |  - Code 128, asset_id embedded below
 *      | ICT-LAPTOP-0001                    |  - bwip-js include text
 *      | Lenovo ThinkPad T480               |  - 10px asset name (if provided)
 *      ______________________________________
 * 
 * Server file usage: API routes like lib/qrcode and lib/barcode
 * -------------------------------------------------------------
 *      import { buildQrBuffer, buildBarcodeBuffer } from '@/lib/idCode/idCodeImage'
 *      const png = await buildQrBuffer ({ id: 'E404', folder: 'locations' name: 'IOT LAB' })
 * 
 * This file uses:
 *      - `qrcode` npm package for QR matrix generation (works in Node and browser)
 *      - `canvas` npm package on Node (server side) - install: npm install canvas
 *      - browser OffscreenCanvas / HTMLCanvasElement on client side
 *      - `bwip-js` npm package for barcode generation (Node + browser builds exist)
 */

// ------------------------------------------------------------------------------
//                              Shared Constants
// ------------------------------------------------------------------------------
export const APP_BASE_URL = (typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
        // NEXTAUTH_URL is localhost in dev, do NOT use it for QR content
        // (process.env.NEXTAUTH_URL?.startsWith('https://')
            // ? process.env.NEXTAUTH_URL.replace(/\/&/, '')
            // : undefined)
    : undefined) ?? 'https://swinburne-assets.vercel.app'

export const SWINBURNE_NAME = 'SWINBURNE UNIVERSITY OF TECHNOLOGY'

// QR module printing colour - pure black for best visibility
export const QR_DARK_COLOUR = '#000000'


// ------------------------------------------------------------------------------
//                                    Types
// ------------------------------------------------------------------------------
export type qrFolder = 'locations' | 'departments'

export interface qrImageOptions {
    // location_id or department_id
    id: string
    folder: qrFolder
    // location or department name below the QR or barcode
    name?: string
}

export interface barcodeImageOptions {
    // asset_id
    id: string
    // Asset name drawn below the barcode ID (e.g Lenovo ThinkPad T480)
    name?: string
}


// ------------------------------------------------------------------------------
//                       Build the scan URL for the QR code
// ------------------------------------------------------------------------------
// Build the static scan URL encoded into the QR sticker
// Uses APP_BASE_URL - always use production domain and never localhost
export function buildScanUrl(folder: qrFolder, id: string): string {
    const entity = folder === 'locations' ? 'location' : 'department'
    
    // https://swinburne-asset.vercel.app/scan/ <location or department id> / <the location/dept id>
    return `${APP_BASE_URL}/scan/${entity}/${encodeURIComponent(id)}`
}


// ------------------------------------------------------------------------------
//            Canvas drawing utility (shared between server and browser)
// ------------------------------------------------------------------------------
/** Commented by Desmond @ 14-May-26 
 * Draw the complete QR sticker layout onto a canvas context.
 * Called by both server (Node canvas) and the browser (HTMLCanvasElement)
 * 
 * @param ctx - 2D canvas rendering context
 * @param W - Canvas width in pixels
 * @param H - Canvas height in pixels
 * @param qrImage - Pre-rendered QR as an Image/ImageBitmap/HTMLImageElement
 * @param options - QrImageOptions
 * @param scanUrl - The URL encoded in the QR
 * @param entityLabel - e.g Location: E404, or Department: IT
 */
export function drawQrCanvas(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    W: number,
    H: number,
    qrImage: CanvasImageSource,
    options: qrImageOptions,
    scanUrl: string,
    entityLabel: string
): void {
    const QR_SIZE = 240
    const PADDING = 8

    // Header contain two lines of text: University name (14px) + entity label (12px)
    // Total header height = top padding + line1 + gap + line2 + bottom padding
    const HEADER_H = 42 // suitable for two lins of text with padding

    // White background for the entire canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    // ----- Header: Black text with no background ---------------------------------

    // Line 1: University name - bold, black
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(SWINBURNE_NAME, W / 2, 16)

    // Line 2: Entity label (e.g Location: E404) - regular, dark grey
    ctx.fillStyle = '#161719'
    ctx.font = '11px sans-serif'
    ctx.fillText(entityLabel, W / 2, 33)

    // ----- QR code - centered below the two header lines --------------------------
    const qrX = (W - QR_SIZE) / 2
    const qrY = HEADER_H + PADDING
    ctx.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE)

    // ------ Scan URL below the QR code --------------------------------------------
    ctx.fillStyle = '#3a3d44'
    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    const urlY = qrY + QR_SIZE + 12 
    const displayUrl = scanUrl.length > 52 ? scanUrl.slice(0, 50) + '...' : scanUrl
    ctx.fillText(displayUrl, W / 2, urlY)

    // --------- Name display below the URL -----------------------------------------
    // If name exists
    if (options.name) {
        ctx.fillStyle = '#111827'
        ctx.font = 'bold 11px sans-serif'
        ctx.fillText(options.name, W / 2, urlY + 15)
    }

    // Thin light border - act as a paper cutout cutting guide
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 0.5
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1)
}


// ------------------------------------------------------------------------------
//                                Export Canvas
// ------------------------------------------------------------------------------
/**
 * Canvas dimensions for QR sticker
 * H = HEADER_H(42) + PADDING(8) + QR_SIZE(240) + URL_LINE(12) + NAME_LINE(15) + bottom_padding(8)
 * WIth name: -325px, Without name: -310px. Use 330 as a safe fixed height.
 */
export function qrCanvasDimensions() {
    return {
        W: 300,
        H: 330
    }
}


// ------------------------------------------------------------------------------
//                  Generate QR code as Data URL in the browser
// ------------------------------------------------------------------------------
// These functions run in the browser and used by qrPreview.tsx and barcodePreview.tsx

/**
 * Generate a QR code sticker as a data URL in the browser
 * Render the full composite layout (Header + QR + URL + name) so the preview exactly matches what gets
 * saved to Supabase.
 * 
 * @param options - qrImageOptions
 * @returns - PNG data URL string suitable for <img src = {...} />
 */
export async function buildQrDataUrl(options: qrImageOptions): Promise<string> {
    if (typeof window === 'undefined') {
        throw new Error('buildQrDataUrl must only be called in the browser')
    }

    const qrCode = (await import('qrcode')).default
    const scanUrl = buildScanUrl(options.folder, options.id)

    // Generate bare QR as data URL
    const qrDataUrl = await qrCode.toDataURL(scanUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 240,
        color: {
            dark: QR_DARK_COLOUR,
            light: '#ffffff'
        }
    })

    const { W, H } = qrCanvasDimensions()
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        throw new Error('Could not get canvas context')
    }

    const entity = options.folder === 'locations' ? 'Location' : 'Department'
    const entityLabel = `${entity}: ${options.id}`

    // Load QR data URL into an image element
    await new Promise<void>((resolve, reject) => {
        const img = new Image()

        img.onload = () => {
            drawQrCanvas(ctx, W, H, img, options, scanUrl, entityLabel)
            resolve()
        }

        img.onerror = reject
        img.src = qrDataUrl
    })

    return canvas.toDataURL('image/png')
}


// ------------------------------------------------------------------------------
//              Generate barcode as Data URL in the browser
// ------------------------------------------------------------------------------
/**
 * Generate a barcode sticker as a data URL in the browser
 * Uses bwip-js browser build to render Code 128, then adds the Swinburne header and
 * asset name onto a canvas
 * 
 * @param options - barcodeImageOptions
 * @returns - PNG data URL string
 */
export async function buildBarcodeDataUrl(options: barcodeImageOptions): Promise<string> {
    if (typeof window === 'undefined') {
        throw new Error('buildBarcodeDataUrl must only be called in the browser')
    }

    // Dynamically import bwip-js
    const bwipjs = (await import ('bwip-js')).default

    /**
     * Header is plain text with no background fill
     * Single line: University name and small top padding for breathing room
     */
    const HEADER_H = 22
    const BAR_W = 320
    const BAR_H = 80
    const PADDING = 6
    const NAME_H = options.name ? 16 : 0
    const W = 360
    const H = HEADER_H + PADDING + BAR_H + NAME_H + PADDING + 12

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        throw new Error('Could not get canvas context')
    }

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    // University name, plain black with no background strip
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(SWINBURNE_NAME, W / 2, 15)

    // Render barcode to a temporary canvas via bwip-js
    const barcodeCanvas = document.createElement('canvas')
    bwipjs.toCanvas(barcodeCanvas, {
        bcid: 'code128',
        text: options.id,
        scale: 3,
        height: 20,
        includetext: true, // asset_id number below the bars (industry standard)
        textxalign: 'center',
        textsize: 11,
        paddingwidth: 6,
        paddingheight: 4,
        backgroundcolor: '#ffffff',
        barcolor: '#000000',
        textcolor: '#000000'
    })

    // Draw the barcode centered on the main canvas
    const barX = (W - BAR_W) / 2
    const barY = HEADER_H + PADDING
    ctx.drawImage(barcodeCanvas, barX, barY, BAR_W, BAR_H + 12)

    // Asset name below the barcode if provided
    // if (options.name) {
    //     ctx.fillStyle = '#111827'
    //     ctx.font = '10px sans-serif'
    //     ctx.textAlign = 'center'
    //     ctx.fillText(options.name, W / 2, barY + BAR_H + 12)
    // }

    // Thin light border - act as a paper cutout cutting guide
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 0.5
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1)

    return canvas.toDataURL('image/png')
}


// ------------------------------------------------------------------------------
//      Safely import the Node.js 'canvas' package and validate the export
// ------------------------------------------------------------------------------
/** Commented by Desmond @ 16-May-26: Canvas package fix 
 * When 'canvas' was marked optional in package.json, the runtime import could
 * resolve to an empty object / undefined, causing createCanvas to be undefined and
 * bwip-js to fall back to its internal shim, which does not support fillText, 
 * producing square-block characters.
 * 
 * 'canvas' is now a regular (non-optional) dependency. It is also declared as a 
 * serverExternalPackage in next.config.js so the Vercel bundler never tries to bundle
 * the native .node binary.
 * 
 * This guard throws a clear error if the package is still missing rather than producing
 * broken images.
 * 
 * @throws { Error } if the canvas package is not installed or createCanvas is missing
 */
async function requireNodeCanvas() {
    let mod: {
        createCanvas: unknown
        loadImage: unknown
    }

    try {
        mod = await import('canvas')
    } catch {
        throw new Error(
            '[idCodeImage] The "canvas" package is not installed. ' +
            'Run `npm install canvas` and ensure it is listed as a regular ' +
            'dependency (not optional) in package.json.'
        )
    }

    if (typeof mod.createCanvas !== 'function') {
        throw new Error(
            '[idCodeImage] canvas.createCanvas is not a function. ' +
            'The package may have loaded an empty shim. ' + 
            'Check that "canvas" in dependencies (not devDependencies or optionalDependencies) ' +
            'and that next.config.js lists it in serverExternalPackages.'
        )
    }

    return mod as {
        createCanvas: (w: number, h: number) => {
            getContext: (t: '2d') => CanvasRenderingContext2D
            toBuffer: (mime: 'image/png') => Buffer
        }

        loadImage: (src: Buffer | string) => Promise<CanvasImageSource>
    }
}


// ------------------------------------------------------------------------------
//     Server-side component: Generate the full composite PNG as a buffer
// ------------------------------------------------------------------------------
// These functions should only run in API routes / server utility files
// They use the `canvas` npm package (server-only) and `qrcode` + `bwip-js`

/**
 * Generate the full QR sticker PNG as a buffer
 * Used by app/api/location/route.ts and app/api/department/route.ts
 * when creating new records
 * 
 * Requires npm install canvas (which is a native module and likely installed already)
 * 
 * @param options - qrImageOptions (id, folder, name)
 * @returns - PNG buffer ready for Supabase storage upload
 */
export async function buildQrBuffer(options: qrImageOptions): Promise<Buffer> {
    // Dynamically import the modules and keep server-only modules out of the client bunndle
    const qrCode = (await import('qrcode')).default
    const { createCanvas, loadImage } = await requireNodeCanvas()

    const scanUrl = buildScanUrl(options.folder, options.id)

    // Generate the bare QR as PNG buffer
    const qrPngBuffer = await qrCode.toBuffer(scanUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 240,
        color: {
            dark: QR_DARK_COLOUR,
            light: '#ffffff'
        }
    })

    const { W, H } = qrCanvasDimensions()
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D

    const entity = options.folder === 'locations' ? 'Location' : 'Department'
    const entityLabel = `${entity}: ${options.id}`

    const qrImage = await loadImage(qrPngBuffer)
    drawQrCanvas(ctx, W, H, qrImage as unknown as CanvasImageSource, options, scanUrl, entityLabel)

    return canvas.toBuffer('image/png')
}


/**
 * Generate the full barcode sticker PNG as a buffer
 * Used by app/api/assets/route.ts when creating new asset records
 * 
 * @param options - barcodeImageOptions (id, name)
 * @returns - PNG buffer ready for Supabase storage upload
 */
export async function buildBarcodeBuffer(options: barcodeImageOptions): Promise<Buffer> {
    const bwipjs = (await import ('bwip-js')).default
    const { createCanvas } = await import('canvas')

    // Same layout as buildBarcodeDataUrl where the header is plain text with no background strip
    const HEADER_H = 22
    const BAR_H = 80
    const PADDING = 6
    const NAME_H = options.name ? 16 : 0
    const W = 360
    const H = HEADER_H + PADDING + BAR_H + NAME_H + PADDING
    
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D

    // White background 
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    // University name
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(SWINBURNE_NAME, W / 2, 15)

    // Generate barcode PNG via bwip-js (returns a Buffer in Node)
    const barcodePng = await bwipjs.toBuffer({
        bcid: 'code128',
        text: options.id,
        scale: 3,
        height: 20,
        includetext: true,
        textxalign: 'center',
        textsize: 11,
        paddingwidth: 6,
        paddingheight: 4,
        backgroundcolor: '#ffffff',
        barcolor: '#000000',
        textcolor: '#000000'
    })

    const { loadImage } = await import('canvas')
    const barImg = await loadImage(barcodePng)
    const BAR_W = 320
    const barX = (W - BAR_W) / 2
    const barY = HEADER_H + PADDING

    ctx.drawImage(barImg as unknown as CanvasImageSource, barX, barY, BAR_W, BAR_H)

    // Asset name below the barcode if provided
    // if (options.name) {
    //     ctx.fillStyle = '#111827'
    //     ctx.font = '10px sans-serif'
    //     ctx.textAlign = 'center'
    //     ctx.fillText(options.name, W / 2, barY + BAR_H + 12)
    // }

    // Thin light border - act as a paper cutout cutting guide
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 0.5
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1)

    return canvas.toBuffer('image/png')
}