import React, { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { Button } from "@/src/shared/ui/Button";
import { Feedback } from "@/src/shared/ui/Feedback";
import { areaStyles } from "@/src/shared/layout/AreaUI";

type DetectorType = { new(): { detect(video: HTMLVideoElement): Promise<{ rawValue: string }[]> } };
export function BarcodeCamera({ onRead }: { onRead: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const active = useRef(false);
  const [open, setOpen] = useState(false); const [error, setError] = useState("");
  const stop = () => { active.current = false; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; if (timer.current) clearTimeout(timer.current); setOpen(false); };
  useEffect(() => () => { active.current = false; stream.current?.getTracks().forEach(t => t.stop()); if (timer.current) clearTimeout(timer.current); }, []);
  const start = async () => {
    setError("");
    const Detector = (globalThis as unknown as { BarcodeDetector?: DetectorType }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) { setError("Este navegador não permite leitura pela câmara. Use um leitor físico ou introduza o código."); return; }
    try {
      active.current = true;
      const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (!active.current) { camera.getTracks().forEach(t => t.stop()); return; }
      stream.current = camera; setOpen(true); const detector = new Detector();
      const scan = async () => {
        if (!active.current) return;
        try {
          if (video.current) {
            if (video.current.srcObject !== camera) { video.current.srcObject = camera; await video.current.play(); }
            if (video.current.readyState >= 2) {
              const codes = await detector.detect(video.current);
              if (codes[0]?.rawValue) { onRead(codes[0].rawValue); stop(); return; }
            }
          }
        } catch { setError("Não foi possível ler o código. Tente novamente ou introduza-o manualmente."); stop(); return; }
        if (active.current) timer.current = setTimeout(scan, 250);
      };
      timer.current = setTimeout(scan, 100);
    } catch { stop(); setError("Não foi possível abrir a câmara. Verifique a permissão ou use um leitor físico."); }
  };
  return <View style={{ gap: 8 }}><Text style={areaStyles.hint}>A câmara identifica o produto; a receção exige confirmação separada.</Text>
    {!open && <Button title="Ler com a câmara" variant="secondary" onPress={start} />}
    {open && <><video ref={video} playsInline muted aria-label="Leitura do código de barras" style={{ width: "100%", maxHeight: 280, objectFit: "contain" }} /><Button title="Fechar câmara" onPress={stop} /></>}
    <Feedback testID="barcode-camera-error" error message={error} />
  </View>;
}
