import { Points } from "~/types";
import "./card.css"

interface CardProps {
  points?: Points;
  visible: boolean;
  flip: boolean;
}

export default function Card({ points, visible, flip = false }: CardProps) {
  return (
    <div className={`card relative mx-auto ${visible ? "opacity-100" : "opacity-0"} ${flip ? "flip" : ""}`}>
      <div className="content absolute h-full w-full shadow-md">
        <div className="front absolute h-full w-full rounded-md bg-slate-100 text-center flex justify-center items-center">
          {points}
        </div>
        <div className="back absolute h-full w-full rounded-md"></div>
      </div>
    </div>
  );
}
