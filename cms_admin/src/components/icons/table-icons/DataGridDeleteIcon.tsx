import { SvgType } from 'types/SvgType';

const DataGridDeleteIcon = (props: SvgType) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={props.width || '24px'}
    height={props.height || '24px'}
  >
    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
    <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      {' '}
      <path
        d="M10 12V17"
        stroke={props.fill || '#000000'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>{' '}
      <path
        d="M14 12V17"
        stroke={props.fill || '#000000'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>{' '}
      <path
        d="M4 7H20"
        stroke={props.fill || '#000000'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>{' '}
      <path
        d="M6 10V18C6 19.6569 7.34315 21 9 21H15C16.6569 21 18 19.6569 18 18V10"
        stroke={props.fill || '#000000'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>{' '}
      <path
        d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z"
        stroke={props.fill || '#000000'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>{' '}
    </g>
  </svg>
);

export default DataGridDeleteIcon;
