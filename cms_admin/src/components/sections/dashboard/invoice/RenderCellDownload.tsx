import { Button } from '@mui/material';
import { GridCellParams, GridValidRowModel } from '@mui/x-data-grid';
import { useBreakpoints } from 'providers/useBreakpoints';

type ParamsProps = {
  params: GridCellParams;
};
const RenderCellDownload = ({ params }: ParamsProps) => {
  const { up } = useBreakpoints();
  const upLg = up('lg');
  const handleDownloadRequest = (row: GridValidRowModel) => {
    console.log(row);
  };

  return (
    <Button
      variant="outlined"
      size={upLg ? 'medium' : 'small'}
      onClick={() => handleDownloadRequest(params.row)}
    >
      Download
    </Button>
  );
};

export default RenderCellDownload;
