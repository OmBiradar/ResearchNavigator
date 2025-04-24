import React from 'react';

interface FileAttachmentProps {
  fileName: string;
  fileSize: string;
  filePath: string;
  fileType: string;
}

const FileAttachment: React.FC<FileAttachmentProps> = ({
  fileName,
  fileSize,
  filePath,
  fileType,
}) => {
  return (
    <div className="flex flex-col border border-gray-200 rounded-lg p-2 mb-4 w-full max-w-md">
      <div className="flex items-center mb-2">
        <div className="flex-1">
          <h3 className="text-sm font-medium">{fileName}</h3>
          <p className="text-xs text-gray-500">{fileSize}</p>
        </div>
        <button className="p-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
          </svg>
        </button>
      </div>
      <div className="flex items-center justify-center bg-gray-50 rounded p-6">
        {fileType === 'pdf' && (
          <div className="flex flex-col items-center text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="text-xs mt-2">{fileName}</span>
            <span className="text-xs text-gray-500">{fileSize}</span>
          </div>
        )}
      </div>
      <div className="mt-2">
        <button className="flex items-center justify-center w-full rounded-md bg-white border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Open PDF
        </button>
      </div>
    </div>
  );
};

export default FileAttachment;