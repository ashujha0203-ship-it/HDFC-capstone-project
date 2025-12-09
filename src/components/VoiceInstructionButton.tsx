import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Pause, Play } from "lucide-react";
import { useVoiceInstructions } from "@/hooks/useVoiceInstructions";
import { useEffect, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VoiceInstructionButtonProps {
  text: string;
  autoPlay?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function VoiceInstructionButton({
  text,
  autoPlay = false,
  variant = "outline",
  size = "default",
  className = "",
}: VoiceInstructionButtonProps) {
  const { speak, stop, toggle, isSpeaking, isPaused, isSupported } =
    useVoiceInstructions();
  const hasAutoPlayed = useRef(false);

  useEffect(() => {
    if (autoPlay && isSupported && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      // Small delay to ensure page is ready
      const timer = setTimeout(() => {
        speak(text);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, isSupported, speak, text]);

  if (!isSupported) {
    return null;
  }

  const handleClick = () => {
    if (isSpeaking && !isPaused) {
      toggle();
    } else if (isPaused) {
      toggle();
    } else {
      speak(text);
    }
  };

  const handleStop = () => {
    stop();
  };

  const getIcon = () => {
    if (isSpeaking && !isPaused) {
      return <Pause className="h-4 w-4" />;
    }
    if (isPaused) {
      return <Play className="h-4 w-4" />;
    }
    return <Volume2 className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (isSpeaking && !isPaused) {
      return "Pause";
    }
    if (isPaused) {
      return "Resume";
    }
    return "Play Instructions";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            className="gap-2"
          >
            {getIcon()}
            {size !== "icon" && <span>{getLabel()}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to hear voice instructions</p>
        </TooltipContent>
      </Tooltip>

      {(isSpeaking || isPaused) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleStop}>
              <VolumeX className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Stop</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
