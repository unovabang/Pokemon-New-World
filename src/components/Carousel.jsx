import { useEffect, useState, useRef } from "react";

export default function Carousel({ images = [], interval = 4000 }) {
	const [i, setI] = useState(0);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const total = images.length;
	
	const next = () => {
		if (isTransitioning) return;
		setIsTransitioning(true);
		setTimeout(() => {
			setI((v) => (v + 1) % total);
		}, 50);
		setTimeout(() => setIsTransitioning(false), 650);
	};
	
	const prev = () => {
		if (isTransitioning) return;
		setIsTransitioning(true);
		setTimeout(() => {
			setI((v) => (v - 1 + total) % total);
		}, 50);
		setTimeout(() => setIsTransitioning(false), 650);
	};
	
	const goToSlide = (index) => {
		if (isTransitioning || index === i) return;
		setIsTransitioning(true);
		setTimeout(() => {
			setI(index);
		}, 50);
		setTimeout(() => setIsTransitioning(false), 650);
	};
	
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
					{images.map((src, index) => (
						<div key={src} className={`slide ${index === i ? "active" : ""}`}>
							<img src={src} alt="Capture" loading="lazy" />
							<div className="mask" />
						</div>
					))}
				</div>
				{total > 1 && (
					<>
						<button
							className={`arrow prev ${isTransitioning ? "transitioning" : ""}`}
							onClick={prev}
							aria-label="Précédent"
							disabled={isTransitioning}
						>
							‹
						</button>
						<button 
							className={`arrow next ${isTransitioning ? "transitioning" : ""}`} 
							onClick={next} 
							aria-label="Suivant"
							disabled={isTransitioning}
						>
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
							className={`dot ${idx === i ? "active" : ""} ${isTransitioning ? "transitioning" : ""}`}
							onClick={() => goToSlide(idx)}
							aria-label={`Aller à l'image ${idx + 1}`}
							disabled={isTransitioning}
						/>
					))}
				</div>
			)}
		</div>
	);
}
