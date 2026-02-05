import React from 'react';
import { FileText } from 'lucide-react';

const Header = () => {
    return (
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <span className="text-2xl font-bold text-gray-900 tracking-tight">
                            PDF<span className="text-blue-600">Snap</span>
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
