import { Volume2 } from 'lucide-react'
import { useEffect } from 'react'
import { notify } from '@/shared/stores/vocaStore'
import { speechSupported } from '@/shared/lib/speech'
export default function SpeakButton({ text, large = false }: { text: string; large?: boolean }) {
  useEffect(() => () => { if (speechSupported()) window.speechSynthesis.cancel() }, [])
  const speak = () => {
    if (!speechSupported()) { notify('이 브라우저는 음성 재생을 지원하지 않아요.'); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.85
    utterance.onerror = (event) => { if (event.error !== 'interrupted' && event.error !== 'canceled') notify('발음을 재생하지 못했어요. 기기의 영어 음성을 확인해 주세요.') }
    window.speechSynthesis.speak(utterance)
  }
  return <button type="button" onClick={speak} className={large ? 'btn mx-auto size-20 rounded-full bg-brand-soft text-brand hover:bg-lime' : 'btn btn-quiet shrink-0 px-2.5'} aria-label="영어 발음 듣기"><Volume2 size={large ? 32 : 18} /></button>
}
