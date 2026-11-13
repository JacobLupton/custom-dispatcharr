import React, { Suspense } from 'react';
import { PageHeader, PageLoader } from '@core/ui';

/** Renders an unmodified upstream page inside the mobile shell. */
export default function LegacyPage({ title, children }) {
  return (
    <div className="dm-legacy">
      <PageHeader title={title} />
      <div className="dm-legacy-body">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </div>
    </div>
  );
}
