import React, { useEffect, useState } from 'react';

const CongratsOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const [show, setShow] = useState(false);
	useEffect(() => {
    const h = () => setShow(true);
		window.addEventListener('lb:showCongrats', h as EventListener);
		return () => window.removeEventListener('lb:showCongrats', h as EventListener);
	}, []);
	if (!show) return null;
	return (
		<div className="fixed inset-0 z-[2147483647] bg-black/40 flex items-center justify-center" onClick={() => { setShow(false); onClose(); }}>
			<div className="relative bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-[90%] text-center shadow-xl" onClick={(e)=>e.stopPropagation()}>
				<h3 className="text-2xl font-bold text-slate-800">Congrats! 🎉</h3>
				<p className="text-slate-600 mt-1">You created your first website with LovaBridge.</p>
				<div className="mt-4">
					<button className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setShow(false); onClose(); }}>Exit tutorial</button>
				</div>
			</div>
		</div>
	);
};

export default CongratsOverlay;
