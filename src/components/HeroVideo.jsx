export default function HeroVideo({ videoId, children }) {
	if (!videoId || typeof videoId !== 'string' || !videoId.trim()) {
		return (
			<div className="hero-video">
				<div className="overlay" />
				<div className="copy">{children}</div>
			</div>
		);
	}
	const id = videoId.trim();
	const src = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0&playsinline=1`;
	return (
		<div className="hero-video">
			<div className="video">
				<iframe
					src={src}
					title="Trailer Pokémon New World"
					allow="autoplay; encrypted-media; picture-in-picture; web-share"
				/>
			</div>
			<div className="overlay" />
			<div className="copy">{children}</div>
		</div>
	);
}
