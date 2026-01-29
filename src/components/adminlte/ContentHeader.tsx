import React from 'react';

interface ContentHeaderProps {
    title: string;
    breadcrumbs?: { label: string; href?: string; active?: boolean }[];
}

const ContentHeader: React.FC<ContentHeaderProps> = ({ title, breadcrumbs = [] }) => {
    return (
        <div className="content-header">
            <div className="container-fluid">
                <div className="row mb-2">
                    <div className="col-sm-6">
                        <h1 className="m-0">{title}</h1>
                    </div>
                    <div className="col-sm-6">
                        <ol className="breadcrumb float-sm-end">
                            {breadcrumbs.map((crumb, index) => (
                                <li
                                    key={index}
                                    className={`breadcrumb-item ${crumb.active ? 'active' : ''}`}
                                >
                                    {crumb.href && !crumb.active ? (
                                        <a href={crumb.href}>{crumb.label}</a>
                                    ) : (
                                        crumb.label
                                    )}
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContentHeader;
