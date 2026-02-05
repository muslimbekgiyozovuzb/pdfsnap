import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, X, Plus } from 'lucide-react';

const FileUpload = ({ files, setFiles, activeTab, splitRange, setSplitRange, splitError, totalPages }) => {
    const maxFiles = activeTab === 'split' ? 1 : 3;

    const onDrop = useCallback((acceptedFiles) => {
        setFiles((prev) => {
            const newFiles = [...prev, ...acceptedFiles];
            return newFiles.slice(0, maxFiles);
        });
    }, [setFiles, maxFiles]);

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
        },
        maxFiles: maxFiles,
        noClick: files.length > 0,
        noKeyboard: files.length > 0,
        disabled: files.length >= maxFiles
    });

    // If no files, show the large dropzone
    if (files.length === 0) {
        return (
            <div className="w-full">
                <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-2xl py-16 px-6 text-center transition-all duration-300 cursor-pointer group shadow-sm ${isDragActive
                        ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                        : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50 bg-white'
                        }`}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className={`p-3 rounded-full transition-colors ${isDragActive ? 'bg-blue-100' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                            <UploadCloud className={`w-8 h-8 ${isDragActive ? 'text-blue-600' : 'text-blue-500'}`} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-lg font-semibold text-gray-900">
                                {isDragActive ? 'Drop PDF files here' : 'Drop PDF files here'}
                            </p>
                            <p className="text-gray-500 text-sm">
                                or click to select documents
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // If files exist, show the list
    return (
        <div className="w-full">
            {/* Hidden input for the 'Add more' button to trigger */}
            <input {...getInputProps()} />

            <div className="space-y-3">
                {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex flex-col p-4 bg-white rounded-xl border border-slate-200 relative animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                                    <File className="w-5 h-5" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-bold text-slate-800 truncate text-sm">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(index);
                                }}
                                className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Split Mode Input */}
                        {activeTab === 'split' && (
                            <div className="mt-3 pl-[52px]">
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Pages to extract
                                    {totalPages > 0 && (
                                        <span className="text-slate-400 font-normal ml-1">
                                            (1-{totalPages} available)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    value={splitRange || ''}
                                    onChange={(e) => setSplitRange && setSplitRange(e.target.value)}
                                    placeholder="e.g., 1-5, 8, 11-13"
                                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 outline-none transition-all placeholder-gray-400 bg-slate-50 focus:bg-white ${splitError
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                                        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                />
                                {splitError && (
                                    <p className="mt-1 text-xs text-red-600 font-medium">
                                        {splitError}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Only show Add More button if limit not reached */}
            {files.length < maxFiles && (
                <div className="mt-6 flex justify-start">
                    <button
                        type="button"
                        onClick={open}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-transparent border border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add more files
                    </button>
                </div>
            )}

            {/* Optional: Show limit message */}
            {files.length >= maxFiles && activeTab === 'merge' && (
                <p className="mt-4 text-center text-xs text-gray-400">
                    Maximum {maxFiles} files allowed
                </p>
            )}
        </div>
    );
};

export default FileUpload;
