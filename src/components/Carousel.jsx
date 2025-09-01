import { useEffect, useState, useRef } from "react";

export default function Carousel({ images = [], interval = 4000 }) {
	const [i, setI] = useState(0);
	const total = images.length;
	const next = () => setI((v) => (v + 1) % total);
	const prev = () => setI((v) => (v - 1 + total) % total);
	const timer = useRef(null);

	useEffect(() => {
		if (total <= 1) return;
		timer.current = setInterval(next, interval);
		return () => clearInterval(timer.current);
	}, [total, interval]);

	return (
		<div className="carousel">
			<div className="viewport card">
				<div
					className="track"
					style={{ transform: `translateX(-${i * 100}%)` }}
				>
					{images.map((src) => (
						<div key={src} className="slide">
							<img src={src} alt="Capture" loading="lazy" />
							<div className="mask" />
						</div>
					))}
				</div>
				{total > 1 && (
					<>
						<button
							className="arrow prev"
							onClick={prev}
							aria-label="Précédent"
						>
							‹
						</button>
						<button className="arrow next" onClick={next} aria-label="Suivant">
							›
						</button>
					</>
				)}
			</div>
			{total > 1 && (
				<div className="controls">
					{images.map((_, idx) => (
						<button
							key={idx}
							className={`dot ${idx === i ? "active" : ""}`}
							onClick={() => setI(idx)}
							aria-label={`Aller à l'image ${idx + 1}`}
						/>
					))}
				</div>
			)}
		</div>
	);
}
