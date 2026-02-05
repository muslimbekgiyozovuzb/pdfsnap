import React from 'react';
import { Merge, Split } from 'lucide-react';

const TabSwitcher = ({ activeTab, setActiveTab }) => {
    return (
        <div className="flex justify-center mb-4">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 inline-flex">
                <button
                    onClick={() => setActiveTab('merge')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'merge'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Merge className="w-4 h-4" />
                    Merge PDF
                </button>
                <button
                    onClick={() => setActiveTab('split')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'split'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Split className="w-4 h-4" />
                    Split PDF
                </button>
            </div>
        </div>
    );
};

export default TabSwitcher;
