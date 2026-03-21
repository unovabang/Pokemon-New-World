import { useEffect } from "react";

export default function Modal({ open, onClose, title, children, dialogClassName }) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e) => e.key === "Escape" && onClose?.();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div
			className="modal open"
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			<div className="backdrop" onClick={onClose} />
			<div className={["dialog", "card", dialogClassName].filter(Boolean).join(" ")}>
				<header>
					<h3>{title}</h3>
					<button className="close" onClick={onClose} aria-label="Fermer">
						<i className="fa-solid fa-xmark" />
					</button>
				</header>
				<div className="body">{children}</div>
			</div>
		</div>
	);
}
