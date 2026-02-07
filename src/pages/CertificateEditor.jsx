import { useState } from 'react';

const CertificateEditor = () => {
    const [file, setFile] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        setFile(selected);

        if (selected && selected.type.startsWith("image/")) {
            setPreviewURL(URL.createObjectURL(selected));
        } else {
            setPreviewURL(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append("template", file);

        try {
            // Replace with your backend API endpoint
            const response = await fetch("/api/certificates/upload-template", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                alert("✅ Template uploaded successfully!");
                setFile(null);
                setPreviewURL(null);
            } else {
                alert("❌ Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("❌ Upload error");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
                <h2 className="text-3xl sm:text-4xl font-bold text-center text-orange-800 mb-8 drop-shadow-lg flex items-center justify-center gap-2">🖼️ Upload Certificate Template</h2>
                <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100 mb-8">
                    <input
                        type="file"
                        accept=".jpg,.png,.pdf"
                        className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition mb-4"
                        onChange={handleFileChange}
                    />
                    {previewURL && (
                        <div className="mb-4 flex justify-center">
                            <img
                                src={previewURL}
                                alt="Preview"
                                className="max-h-60 border rounded shadow"
                            />
                        </div>
                    )}
                    <button
                        onClick={handleUpload}
                        disabled={!file}
                        className={`w-full bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow transition-colors duration-200 text-lg flex items-center gap-2 justify-center ${!file ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                        Upload
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CertificateEditor;
