const {
  useState,
  useCallback,
  useEffect,
  useRef
} = React;
const UploadCloudIcon = () => /*#__PURE__*/React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "48",
  height: "48",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
}), /*#__PURE__*/React.createElement("polyline", {
  points: "17 8 12 3 7 8"
}), /*#__PURE__*/React.createElement("line", {
  x1: "12",
  x2: "12",
  y1: "3",
  y2: "15"
}));
const Wand2Icon = ({
  size = 48
}) => /*#__PURE__*/React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.21 1.21 0 0 0 1.72 0L21.64 5.36a1.21 1.21 0 0 0 0-1.72Z"
}), /*#__PURE__*/React.createElement("path", {
  d: "m14 7 3 3"
}), /*#__PURE__*/React.createElement("path", {
  d: "M5 6v4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M19 14v4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M10 2v2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M7 8H3"
}), /*#__PURE__*/React.createElement("path", {
  d: "M21 16h-4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M11 3H9"
}));
const DownloadIcon = () => /*#__PURE__*/React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
}), /*#__PURE__*/React.createElement("polyline", {
  points: "7 10 12 15 17 10"
}), /*#__PURE__*/React.createElement("line", {
  x1: "12",
  x2: "12",
  y1: "15",
  y2: "3"
}));
const XIcon = () => /*#__PURE__*/React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("line", {
  x1: "18",
  y1: "6",
  x2: "6",
  y2: "18"
}), /*#__PURE__*/React.createElement("line", {
  x1: "6",
  y1: "6",
  x2: "18",
  y2: "18"
}));
const Logo = () => /*#__PURE__*/React.createElement("h1", {
  className: "text-4xl font-bold text-white tracking-wider"
}, "K", /*#__PURE__*/React.createElement("span", {
  className: "text-purple-400"
}, "\u0394"), "IR", /*#__PURE__*/React.createElement("span", {
  className: "text-purple-400"
}, "A"), " Foto\u011Fraf D\xFCzenleme Edit\xF6r\xFC");
const ImagePanel = ({
  title,
  image,
  onImageUpload,
  isLoading,
  onDownload,
  modifiedImage,
  onReset,
  uploadInputId = 'file-upload',
  role,
  weight,
  onRoleChange,
  onWeightChange,
  onRefine
}) => {
  const handleDragOver = useCallback(e => {
    e.preventDefault();
  }, []);
  const handleDrop = useCallback(e => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageUpload({
        target: {
          files: e.dataTransfer.files
        }
      });
    }
  }, [onImageUpload]);

  // === Mask editor (only for result panel: when onImageUpload is falsy) ===
  const [maskMode, setMaskMode] = useState(false);
  const [brushSize, setBrushSize] = useState(32);
  const [isErasing, setIsErasing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const containerRef = useRef(null);
  const overlayRef = useRef(null); // visible red overlay
  const offscreenRef = useRef(null); // white-on-transparent mask data

  const ensureMaskCanvas = useCallback(() => {
    if (!containerRef.current) return;
    if (!overlayRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const overlay = overlayRef.current;
    if (overlay.width !== w || overlay.height !== h) {
      overlay.width = w;
      overlay.height = h;
    }
    if (!offscreenRef.current) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      offscreenRef.current = c;
    } else {
      const off = offscreenRef.current;
      if (off.width !== w || off.height !== h) {
        const prev = document.createElement('canvas');
        prev.width = off.width;
        prev.height = off.height;
        prev.getContext('2d').drawImage(off, 0, 0);
        off.width = w;
        off.height = h;
        off.getContext('2d').drawImage(prev, 0, 0, w, h);
      }
    }
  }, []);
  useEffect(() => {
    if (maskMode) ensureMaskCanvas();
  }, [maskMode, image, ensureMaskCanvas]);
  const getPos = ev => {
    const overlay = overlayRef.current;
    if (!overlay) return {
      x: 0,
      y: 0
    };
    const rect = overlay.getBoundingClientRect();
    const p = ev.touches ? ev.touches[0] : ev;
    return {
      x: p.clientX - rect.left,
      y: p.clientY - rect.top
    };
  };
  const drawAt = ev => {
    const overlay = overlayRef.current;
    const off = offscreenRef.current;
    if (!overlay || !off) return;
    const {
      x,
      y
    } = getPos(ev);
    const r = brushSize / 2;
    const octx = overlay.getContext('2d');
    const mctx = off.getContext('2d');
    // visible red overlay
    octx.save();
    octx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
    octx.fillStyle = 'rgba(255,0,0,0.35)';
    octx.beginPath();
    octx.arc(x, y, r, 0, Math.PI * 2);
    octx.fill();
    octx.restore();
    // white mask data
    mctx.save();
    mctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
    mctx.fillStyle = '#fff';
    mctx.beginPath();
    mctx.arc(x, y, r, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();
    if (!hasMask) setHasMask(true);
  };
  const startDraw = ev => {
    if (!maskMode) return;
    setIsDrawing(true);
    drawAt(ev);
  };
  const moveDraw = ev => {
    if (!maskMode || !isDrawing) return;
    drawAt(ev);
  };
  const endDraw = () => setIsDrawing(false);
  const clearMask = () => {
    if (overlayRef.current) overlayRef.current.getContext('2d').clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    if (offscreenRef.current) offscreenRef.current.getContext('2d').clearRect(0, 0, offscreenRef.current.width, offscreenRef.current.height);
    setHasMask(false);
  };
  const exportMask = () => {
    const off = offscreenRef.current;
    if (!off) return null;
    const out = document.createElement('canvas');
    out.width = off.width;
    out.height = off.height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, out.width, out.height); // black background
    ctx.drawImage(off, 0, 0); // white where painted
    return out.toDataURL('image/png');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-900/50 p-6 rounded-2xl border border-gray-700 flex flex-col gap-4 h-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-semibold text-center text-gray-300"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, onReset && image && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    id: uploadInputId,
    name: uploadInputId,
    type: "file",
    className: "sr-only",
    onChange: onImageUpload,
    accept: "image/png, image/jpeg"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => document.getElementById(uploadInputId)?.click(),
    className: "bg-blue-600/80 hover:bg-blue-700/80 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
  }, "Yeni Foto\u011Fraf"), /*#__PURE__*/React.createElement("button", {
    onClick: onReset,
    className: "bg-gray-700/80 hover:bg-gray-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
  }, "S\u0131f\u0131rla")), modifiedImage && onDownload && /*#__PURE__*/React.createElement("button", {
    onClick: onDownload,
    className: "flex items-center gap-2 bg-green-600/80 hover:bg-green-700/80 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
  }, /*#__PURE__*/React.createElement(DownloadIcon, null), " \u0130ndir"))), /*#__PURE__*/React.createElement("div", {
    className: "relative aspect-square w-full bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-600 transition-all duration-300",
    onDragOver: onImageUpload ? handleDragOver : null,
    onDrop: onImageUpload ? handleDrop : null,
    ref: containerRef
  }, image && /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: title,
    className: "object-contain w-full h-full"
  }), !image && onImageUpload && /*#__PURE__*/React.createElement("label", {
    htmlFor: uploadInputId,
    className: "cursor-pointer text-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center text-gray-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-2 text-gray-500"
  }, /*#__PURE__*/React.createElement(UploadCloudIcon, null)), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Foto\u011Fraf Y\xFCkle"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, "S\xFCr\xFCkleyip b\u0131rak\u0131n veya t\u0131klay\u0131n")), /*#__PURE__*/React.createElement("input", {
    id: uploadInputId,
    name: uploadInputId,
    type: "file",
    className: "sr-only",
    onChange: onImageUpload,
    accept: "image/png, image/jpeg"
  })), !image && !onImageUpload && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center text-gray-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-2 text-gray-500"
  }, /*#__PURE__*/React.createElement(Wand2Icon, null)), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "De\u011Fi\u015Ftirilmi\u015F Foto\u011Fraf"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, "Sonu\xE7 burada g\xF6r\xFCnecek")), isLoading && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center backdrop-blur-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-400"
  })), !onImageUpload && maskMode && /*#__PURE__*/React.createElement("canvas", {
    ref: overlayRef,
    className: "absolute inset-0 z-10 cursor-crosshair",
    onMouseDown: startDraw,
    onMouseMove: moveDraw,
    onMouseUp: endDraw,
    onMouseLeave: endDraw,
    onTouchStart: startDraw,
    onTouchMove: moveDraw,
    onTouchEnd: endDraw
  })), !onImageUpload && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      const v = !maskMode;
      setMaskMode(v);
      if (v) setTimeout(ensureMaskCanvas, 0);
    },
    className: `px-3 py-2 rounded-lg text-sm font-semibold ${maskMode ? 'bg-red-600/80 hover:bg-red-700/80' : 'bg-gray-700/80 hover:bg-gray-700'}`
  }, maskMode ? 'Maske: Açık' : 'Maske: Kapalı'), maskMode && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-gray-400 ml-1"
  }, "F\u0131r\xE7a: ", brushSize, "px"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "8",
    max: "80",
    value: brushSize,
    onChange: e => setBrushSize(parseInt(e.target.value, 10))
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setIsErasing(v => !v),
    className: "px-3 py-2 rounded-lg bg-gray-700/80 hover:bg-gray-700 text-sm"
  }, isErasing ? 'Silgi' : 'Fırça'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: clearMask,
    className: "px-3 py-2 rounded-lg bg-gray-700/80 hover:bg-gray-700 text-sm"
  }, "Temizle"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: !hasMask || isLoading || !onRefine,
    onClick: () => {
      const m = exportMask();
      if (m && onRefine) onRefine(m);
    },
    className: `px-3 py-2 rounded-lg text-sm font-semibold ${!hasMask || isLoading || !onRefine ? 'bg-gray-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`
  }, "B\xF6lgeyi \u0130yile\u015Ftir"))), typeof role !== 'undefined' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs text-gray-400 mb-1"
  }, "Rol"), /*#__PURE__*/React.createElement("select", {
    value: role,
    onChange: e => onRoleChange && onRoleChange(e.target.value),
    className: "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: "\u0130\xE7erik"
  }, "\u0130\xE7erik"), /*#__PURE__*/React.createElement("option", {
    value: "Stil"
  }, "Stil"), /*#__PURE__*/React.createElement("option", {
    value: "Renk"
  }, "Renk"), /*#__PURE__*/React.createElement("option", {
    value: "I\u015F\u0131k"
  }, "I\u015F\u0131k"), /*#__PURE__*/React.createElement("option", {
    value: "Y\xFCz"
  }, "Y\xFCz"), /*#__PURE__*/React.createElement("option", {
    value: "Ortam"
  }, "Ortam"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs text-gray-400 mb-1"
  }, "A\u011F\u0131rl\u0131k: ", weight, "%"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "100",
    value: weight,
    onChange: e => onWeightChange && onWeightChange(parseInt(e.target.value, 10)),
    className: "w-full"
  }))), role === 'Yüz' && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-300 mt-1"
  }, "\u0130pucu: Kimlik kilidi i\xE7in a\u011F\u0131rl\u0131\u011F\u0131 \u2265 %80 ayarlaman \xF6nerilir.")));
};
function App() {
  // === Helpers for masked refinement ===
  const loadImage = src => new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
  const drawContain = (ctx, img, W, H) => {
    const s = Math.min(W / img.width, H / img.height);
    const w = img.width * s;
    const h = img.height * s;
    const x = (W - w) / 2;
    const y = (H - h) / 2;
    ctx.drawImage(img, x, y, w, h);
  };
  const compositeWithMask = async (baseDataUrl, newDataUrl, maskDataUrl) => {
    const [baseImg, newImg, maskImg] = await Promise.all([loadImage(baseDataUrl), loadImage(newDataUrl), loadImage(maskDataUrl)]);
    const W = maskImg.width || Math.max(baseImg.width, newImg.width);
    const H = maskImg.height || Math.max(baseImg.height, newImg.height);
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const ctx = out.getContext('2d');
    // base first
    drawContain(ctx, baseImg, W, H);
    // new image masked
    const tmp = document.createElement('canvas');
    tmp.width = W;
    tmp.height = H;
    const tctx = tmp.getContext('2d');
    drawContain(tctx, newImg, W, H);
    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(maskImg, 0, 0, W, H);
    ctx.drawImage(tmp, 0, 0);
    return out.toDataURL('image/png');
  };
  const handleRefine = async maskDataUrl => {
    if (!apiKey) {
      setError(apiKeyError || 'API anahtarı alınamadı.');
      return;
    }
    if (!modifiedImage) {
      setError('Önce bir sonuç görseli oluştur.');
      return;
    }
    setIsLoading(true);
    setError(null);

    // Parse inline Negative if present
    let posForTranslate = prompt;
    let negFromBlock = '';
    const negBlockMatchR = /(?:^|\n)\s*Negatif\s*:\s*(.+)$/is.exec(prompt || '');
    if (negBlockMatchR) {
      negFromBlock = negBlockMatchR[1].trim();
      posForTranslate = (prompt || '').replace(negBlockMatchR[0], '').trim();
      if (!negativePrompt) setNegativePrompt(negFromBlock);
    }

    // Translate to English
    let englishPositive = posForTranslate || '';
    let englishNegative = negativePrompt || negFromBlock || '';
    try {
      const translateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const translatePayload = {
        contents: [{
          parts: [{
            text: `Translate the following Turkish prompts into clear, concise English for an image-generation task. Return ONLY compact JSON with keys \"positive\" and \"negative\" (negative can be empty). No extra text.\n\nINPUT JSON:\n${JSON.stringify({
              positive: posForTranslate,
              negative: negativePrompt || negFromBlock
            })}`
          }]
        }]
      };
      const tRes = await fetch(translateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(translatePayload)
      });
      if (tRes.ok) {
        const tJson = await tRes.json();
        const tText = tJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (tText && typeof tText === 'string') {
          try {
            const obj = JSON.parse(tText);
            if (obj.positive) englishPositive = obj.positive.trim();
            if (typeof obj.negative === 'string') englishNegative = obj.negative.trim();
          } catch (_) {
            englishPositive = tText.trim();
          }
        }
      }
    } catch (_) {}
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
      const instruction = englishPositive + (englishNegative && englishNegative.trim() ? '\nNegative prompt: ' + englishNegative.trim() : '') + '\n\nRefinement mode: Modify ONLY the region marked white in the attached binary mask (black=keep). Keep composition, camera pose, subject identity and global look unchanged outside the mask. Maintain the same framing.';
      const parts = [{
        text: instruction
      }];
      // current image context
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: modifiedImage.split(',')[1] || ''
        }
      });
      // mask image
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: maskDataUrl.split(',')[1] || ''
        }
      });
      const payload = {
        contents: [{
          parts
        }]
      };
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errJ = await response.json().catch(() => ({}));
        throw new Error(errJ.error?.message || 'Refine API hatası');
      }
      const result = await response.json();
      const genPart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (!genPart?.inlineData?.data) {
        const t = result.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
        throw new Error(t ? `Refine metin döndürdü: ${t}` : 'Refine resim verisi yok');
      }
      const newImgUrl = `data:image/png;base64,${genPart.inlineData.data}`;
      const merged = await compositeWithMask(modifiedImage, newImgUrl, maskDataUrl);
      setModifiedImage(merged);
    } catch (e) {
      console.error('[Refine]', e);
      setError(e.message || String(e));
    } finally {
      setIsLoading(false);
    }
  };
  const [originalImages, setOriginalImages] = useState([null, null, null, null, null]);
  const [modifiedImage, setModifiedImage] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [userBrief, setUserBrief] = useState('');
  const [roles, setRoles] = useState(['İçerik', 'Stil', 'Renk', 'Işık', 'İçerik']);
  const [weights, setWeights] = useState([100, 60, 50, 50, 50]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [apiKeyError, setApiKeyError] = useState(null);
  const handleReset = useCallback(() => {
    setOriginalImages([null, null, null, null, null]);
    setRoles(['İçerik', 'Stil', 'Renk', 'Işık', 'İçerik']);
    setWeights([100, 60, 50, 50, 50]);
    setModifiedImage(null);
    setPrompt('');
    setNegativePrompt('');
    setUserBrief('');
    setError(null);
    setIsLoading(false);
  }, []);
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('https://1513c704aa10.ngrok-free.app/api/get-google-key', {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        const responseText = await response.text();
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Sunucuda API yolu (/api/get-google-key) bulunamadı. Lütfen sunucu kodunuzun güncel olduğundan emin olun.');
          }
          throw new Error(`Sunucu hatası: ${response.status} - ${responseText}`);
        }
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Sunucudan gelen yanıt JSON formatında değil:", responseText);
          throw new Error(`Sunucudan gelen yanıt ayrıştırılamadı. Yanıt: "${responseText.substring(0, 100)}..."`);
        }
        if (data.error) {
          throw new Error(data.error);
        }
        if (!data.apiKey) {
          throw new Error('Sunucudan gelen yanıtta API anahtarı bulunamadı.');
        }
        setApiKey(data.apiKey);
      } catch (err) {
        console.error("API Anahtarı alınırken hata oluştu:", err);
        const friendlyError = err.message.includes('Failed to fetch') ? 'Sunucuya bağlanılamadı. Lütfen sunucunun çalıştığından ve doğru adreste olduğundan emin olun.' : err.message;
        setApiKeyError(friendlyError);
        setError(friendlyError);
      }
    };
    fetchApiKey();
  }, []);
  const makeUploadHandler = idx => e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setOriginalImages(prev => {
        const next = [...prev];
        next[idx] = reader.result;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  // --- AI prompt/negative suggestion from images ---
  const handleSuggest = async () => {
    if (!apiKey) {
      setError(apiKeyError || 'API anahtarı alınamadı.');
      return;
    }
    const picked = originalImages.filter(Boolean);
    if (picked.length === 0) {
      setError('Lütfen önce en az bir bağlam fotoğrafı yükleyin.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      // Yeni, daha detaylı prompt template:
      const parts = [{
        text: 'Aşağıdaki referans görselleri **ve** kullanıcı metnini birlikte değerlendir. ' + 'Sadece **Türkçe** ve **çok satırlı** bir **pozitif prompt** yaz. Mevcut bağlamlar için ayrı satırlar üret; yüklenmeyen bağlam için satır yazma. ' + 'Her satır kısa, net ve emir kipinde olsun. Şu şablonu **aynen** doldur:\n' + 'Bağlam 1’deki ... (kimlik/ana içerik veya ana kompozisyon)\n' + 'Bağlam 2’deki ... (destekleyici içerik veya stil öğesi)\n' + 'Bağlam 3’teki ... (arka plan veya çevresel öğe)\n' + 'Işıklandırma: sahnenin ışık yönü ve kalitesi (örn. geç saat diffüz, golden-hour dokunuşu)\n' + 'Renk/Grade: genel renk paleti ve filmik tonlama (örn. sıcak vurgular, soğuk gölgeler)\n' + 'Kompozisyon & Perspektif: kaçış noktası, açı, kadraj, ölçek uyumu\n' + 'Fiziksel entegrasyon: contact shadow, yansıma/ambient occlusion, zeminle tutunma\n' + 'Hareket ipuçları: tekerlerde hafif radial blur, saçta rüzgâr etkisi (gerekiyorsa)\n' + 'Lens/Netlik: alan derinliği (DOF), keskinlik; yapay oversharpen yok\n' + 'Gerçekçilik kuralları: anatomi ve oranlar korunur; aşırı yumuşatma/beautify yok\n' + 'Son satır **Negatif:** ile başlasın ve istenmeyen ögeleri virgülle kısa kısa yaz.\n\n' + 'Sadece metni döndür; kod bloğu veya açıklama ekleme.'
      }];
      // Mevcut bağlam indeksleri (yalnızca yüklü olanlar)
      const present = originalImages.map((img, idx) => img ? idx + 1 : null).filter(Boolean);
      if (present.length) {
        parts.push({
          text: 'Mevcut bağlamlar: ' + present.join(', ')
        });
      }
      // Rol/ağırlıklara göre kimlik korunumu ipucu (Yüz && ≥0.90)
      const identityIdx = originalImages.findIndex((img, idx) => img && roles[idx] === 'Yüz' && (weights[idx] ?? 0) >= 90);
      if (identityIdx >= 0) {
        parts.push({
          text: `Kimlik korunumu: Bağlam ${identityIdx + 1} — yüz geometrisi ve oranları değişmesin; yaş, ten tonu, göz rengi ve saç çizgisi sabit kalsın; yalnızca ışık/renk uyumu sağla.`
        });
      }
      // Kullanıcı yazısı ekle
      if (userBrief && userBrief.trim()) {
        parts.push({
          text: 'Kullanıcı metni:\n' + userBrief.trim()
        });
      }
      // Bağlam rolleri/ağırlıkları (Türkçe)
      const roleMapTr = {
        'İçerik': 'içerik',
        'Stil': 'stil',
        'Renk': 'renk paleti',
        'Işık': 'ışık',
        'Yüz': 'yüz',
        'Ortam': 'ortam'
      };
      const metaLinesTr = [];
      originalImages.forEach((img, idx) => {
        if (img) {
          const r = roles[idx] || 'İçerik';
          const w = (weights[idx] ?? 50) / 100;
          metaLinesTr.push(`Bağlam ${idx + 1}: rol=${roleMapTr[r] || r}, ağırlık=${w.toFixed(2)}`);
        }
      });
      if (metaLinesTr.length) {
        parts.push({
          text: 'Bağlam rolleri/ağırlıkları:\n' + metaLinesTr.join('\n')
        });
      }
      for (const img of picked.slice(0, 5)) {
        const base64Data = img.split(',')[1];
        const mimeMatch = img.match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }
      const payload = {
        contents: [{
          parts
        }]
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Öneri alınamadı');
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const text = (raw || '').trim();
      // Pozitif metin: son "Negatif:" satırı kaldırılarak
      const positiveOnly = text.replace(/(?:^|\n)\s*Negatif\s*:\s*.+$/is, '').trim();
      setPrompt(positiveOnly);
      // Negatif satırı: ayrı alana
      const negMatch = text.match(/(?:^|\n)\s*Negatif\s*:\s*(.+)$/i);
      if (negMatch) setNegativePrompt(negMatch[1].trim());
    } catch (e) {
      console.error('[Suggest]', e);
      setError(e.message || String(e));
    } finally {
      setIsLoading(false);
    }
  };
  const handleGenerate = async () => {
    if (!apiKey) {
      setError(apiKeyError || "API anahtarı alınamadı. Lütfen sunucu bağlantısını kontrol edin.");
      return;
    }
    const picked = originalImages.filter(Boolean);
    if (picked.length === 0) {
      setError("Lütfen en az 1 fotoğraf yükleyin (en fazla 5).");
      return;
    }
    if (!prompt) {
      setError("Lütfen fotoğrafta ne değişiklik yapmak istediğinizi yazın.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setModifiedImage(null);

    // Kullanıcı tek blok yazdıysa (son satırda "Negatif:") ayır
    let posForTranslate = prompt;
    let negFromBlock = '';
    const negBlockMatch = /(?:^|\n)\s*Negatif\s*:\s*(.+)$/is.exec(prompt);
    if (negBlockMatch) {
      negFromBlock = negBlockMatch[1].trim();
      posForTranslate = prompt.replace(negBlockMatch[0], '').trim();
      if (!negativePrompt) setNegativePrompt(negFromBlock);
    }

    // 1) Translate Turkish prompts → English (positive & negative) with Gemini 2.5 Flash
    let englishPositive = posForTranslate;
    let englishNegative = negativePrompt || negFromBlock;
    try {
      const translateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const translatePayload = {
        contents: [{
          parts: [{
            text: `Translate the following Turkish prompts into clear, concise English for an image-generation task. Return ONLY compact JSON with keys \"positive\" and \"negative\" (negative can be empty). No extra text.\n\nINPUT JSON:\n${JSON.stringify({
              positive: posForTranslate,
              negative: negativePrompt || negFromBlock
            })}`
          }]
        }]
      };
      const tRes = await fetch(translateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(translatePayload)
      });
      if (tRes.ok) {
        const tJson = await tRes.json();
        const tText = tJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (tText && typeof tText === 'string') {
          try {
            const obj = JSON.parse(tText);
            if (obj.positive) englishPositive = obj.positive.trim();
            if (typeof obj.negative === 'string') englishNegative = obj.negative.trim();
          } catch (_) {
            englishPositive = tText.trim();
          }
        }
      } else {
        console.warn('[Editor] Translation call failed, falling back to Turkish prompts');
      }
    } catch (e) {
      console.warn('[Editor] Translation error:', e);
    }
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
      // Guidance injection for roles/weights:
      const roleMap = {
        'İçerik': 'content',
        'Stil': 'style',
        'Renk': 'color palette',
        'Işık': 'lighting',
        'Yüz': 'face identity',
        'Ortam': 'environment'
      };
      const metaLines = [];
      originalImages.forEach((img, idx) => {
        if (img) {
          const r = roles[idx] || 'İçerik';
          const w = (weights[idx] ?? 50) / 100;
          metaLines.push(`Context ${idx + 1}: role=${roleMap[r] || r}, weight=${w.toFixed(2)}`);
        }
      });
      const controlText = metaLines.length ? "\n\nUse the following context roles and weights (0.0–1.0 influence):\n" + metaLines.join("\n") + "\nRespect roles: content guides subjects/composition; style guides texture and look; color palette guides hues/grade; lighting guides direction and quality; face identity preserves the exact person; environment guides background/setting." : '';
      // Face identity lock if any context is marked as 'Yüz' with high weight
      const identityCtx = [];
      originalImages.forEach((img, idx) => {
        if (img && roles[idx] === 'Yüz' && (weights[idx] ?? 0) >= 80) identityCtx.push(idx + 1);
      });
      // BEGIN PATCH: Replace identityText/parts block with automatic negative prompt hardening
      const identityText = identityCtx.length ? "\n\nFace identity lock:\nUse the face in Context " + identityCtx.join(', ') + " as a strict identity reference. Preserve facial geometry and proportions; do not change age, skin tone, eye color, hairline, or facial symmetry. Do not beautify. Only match lighting and color; keep the person recognizably the same." : '';

      // If face identity is active, harden the negative prompt automatically
      let finalNegative = englishNegative || '';
      if (identityCtx.length) {
        const guard = 'face swap, identity change, change age, change skin tone, change eye color, change hairline, change facial geometry, beautify filter';
        finalNegative = finalNegative && finalNegative.trim() ? finalNegative.trim() + ', ' + guard : guard;
      }
      const parts = [{
        text: englishPositive + (finalNegative && finalNegative.trim() ? '\nNegative prompt: ' + finalNegative.trim() : '') + controlText + identityText
      }];
      // END PATCH
      for (const img of picked.slice(0, 5)) {
        const base64Data = img.split(',')[1];
        const mimeMatch = img.match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }
      const payload = {
        contents: [{
          parts
        }]
      };
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "API'den geçersiz bir yanıt alındı.");
      }
      const result = await response.json();
      const generatedPart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (generatedPart && generatedPart.inlineData.data) {
        const imageData = generatedPart.inlineData.data;
        setModifiedImage(`data:image/png;base64,${imageData}`);
      } else {
        const textResponse = result.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
        throw new Error(textResponse ? `API resim yerine metin yanıtı döndürdü: "${textResponse}"` : "API yanıtında resim verisi bulunamadı.");
      }
    } catch (err) {
      setError(`Bir hata oluştu: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  const handleDownload = () => {
    if (!modifiedImage) return;
    const link = document.createElement('a');
    link.href = modifiedImage;
    link.download = `kaira-edited-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-transparent min-h-screen text-white font-sans p-4 sm:p-8 flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-6xl mx-auto"
  }, /*#__PURE__*/React.createElement("header", {
    className: "text-center mb-8"
  }, /*#__PURE__*/React.createElement(Logo, null)), /*#__PURE__*/React.createElement("main", {
    className: "flex flex-col gap-8"
  }, error && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative",
    role: "alert"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "font-bold"
  }, "Hata!"), /*#__PURE__*/React.createElement("span", {
    className: "block sm:inline ml-2"
  }, error), /*#__PURE__*/React.createElement("span", {
    className: "absolute top-0 bottom-0 right-0 px-4 py-3",
    onClick: () => setError(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "cursor-pointer"
  }, /*#__PURE__*/React.createElement(XIcon, null)))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg text-gray-300"
  }, "Ba\u011Flam Foto\u011Fraflar\u0131 (en fazla 5)"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-4"
  }, originalImages.map((img, i) => /*#__PURE__*/React.createElement(ImagePanel, {
    key: i,
    title: `Bağlam ${i + 1}`,
    image: img,
    onImageUpload: makeUploadHandler(i),
    onReset: () => setOriginalImages(prev => {
      const n = [...prev];
      n[i] = null;
      return n;
    }),
    uploadInputId: `original-upload-${i}`,
    role: roles[i],
    weight: weights[i],
    onRoleChange: val => setRoles(prev => {
      const n = [...prev];
      n[i] = val;
      return n;
    }),
    onWeightChange: val => setWeights(prev => {
      const n = [...prev];
      n[i] = val;
      return n;
    })
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleReset,
    className: "bg-gray-700/80 hover:bg-gray-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
  }, "T\xFCm\xFCn\xFC S\u0131f\u0131rla"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-400 self-center"
  }, "\u0130pucu: Farkl\u0131 a\xE7\u0131lardan/kaynaklardan 1\u20135 g\xF6rsel ekleyebilirsin."))), /*#__PURE__*/React.createElement(ImagePanel, {
    title: "De\u011Fi\u015Ftirilmi\u015F Foto\u011Fraf",
    image: modifiedImage,
    isLoading: isLoading,
    onDownload: handleDownload,
    modifiedImage: modifiedImage,
    onRefine: handleRefine
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col md:flex-row gap-4 items-stretch md:items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: userBrief,
    onChange: e => setUserBrief(e.target.value),
    placeholder: "Kullan\u0131c\u0131 yaz\u0131s\u0131 (serbest T\xFCrk\xE7e): Sahneyi, duyguyu, hik\xE2yeyi tarif et. \xD6rn: 'A\u011Fa\xE7 t\xFCnelinde ilerleyen siyah supersport, sa\xE7lar\u0131 r\xFCzg\xE2rda savrulan s\xFCr\xFCc\xFC...'. Bu metin ve ba\u011Flam foto\u011Fraflar\u0131ndan AI pozitif/negatif prompt \xF6nerecek.",
    className: "allow-select pointer-events-auto w-full h-20 md:h-auto bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none",
    onKeyDownCapture: e => e.stopPropagation(),
    onKeyPressCapture: e => e.stopPropagation(),
    onKeyUpCapture: e => e.stopPropagation(),
    onFocusCapture: e => e.stopPropagation(),
    onClickCapture: e => e.stopPropagation()
  }), /*#__PURE__*/React.createElement("textarea", {
    value: prompt,
    onChange: e => setPrompt(e.target.value),
    placeholder: `Ne görmek istiyorsun? (Türkçe çok satırlı; sonda 'Negatif:' yazabilirsin) Örn:\nBağlam 1’deki yüzü sürücü olarak kullan.\nBağlam 2’deki motosikleti esas al.\nBağlam 3’teki ağaç tünelli yolu arka plan olarak kullan.\nGeç saat diffuse ışık, hafif golden-hour dokunuşu; dramatik ama gerçekçi.\nTeker altına gerçekçi contact shadow; lastikler hafif motion blur.\nSaçlarda rüzgâr etkisi; renk/ışık tutarlı olsun.\nNegatif: çift teker, bozuk perspektif, yapay saç kenarı, aşırı blur, painting look`,
    className: "allow-select pointer-events-auto w-full h-24 md:h-auto bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none",
    onKeyDownCapture: e => e.stopPropagation(),
    onKeyPressCapture: e => e.stopPropagation(),
    onKeyUpCapture: e => e.stopPropagation(),
    onFocusCapture: e => e.stopPropagation(),
    onClickCapture: e => e.stopPropagation()
  }), /*#__PURE__*/React.createElement("textarea", {
    value: negativePrompt,
    onChange: e => setNegativePrompt(e.target.value),
    placeholder: "\u0130stemedi\u011Fin \u015Feyler (Negatif prompt) \u2014 \xD6rn: bulan\u0131k sa\xE7 kenar\u0131, a\u015F\u0131r\u0131 blur, painting look, bozuk perspektif",
    className: "allow-select pointer-events-auto w-full h-20 md:h-auto bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none",
    onKeyDownCapture: e => e.stopPropagation(),
    onKeyPressCapture: e => e.stopPropagation(),
    onKeyUpCapture: e => e.stopPropagation(),
    onFocusCapture: e => e.stopPropagation(),
    onClickCapture: e => e.stopPropagation()
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSuggest,
    disabled: isLoading || !apiKey || originalImages.every(img => !img),
    className: "w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg"
  }, "\xD6neri Al (AI)"))), /*#__PURE__*/React.createElement("button", {
    onClick: handleGenerate,
    disabled: isLoading || !apiKey || originalImages.every(img => !img),
    className: "w-full md:w-auto self-stretch md:self-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100"
  }, /*#__PURE__*/React.createElement(Wand2Icon, {
    size: 20
  }), /*#__PURE__*/React.createElement("span", null, isLoading ? 'Değiştiriliyor...' : 'Değiştir'))))));
}
window.initializeReactApp = () => {
  ReactDOM.render(/*#__PURE__*/React.createElement(App, null), document.getElementById('react-root'));
};
