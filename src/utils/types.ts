
export type nodeType = "text"|"image"|"list"|"page"|"heading1"|"heading2"|"heading3"

export type NodeData = {
  id:string ;
  type:nodeType;
  value:string;
}
export type Page = {
  id:string ;
  slug:string;
  title:string;
  nodes:NodeData[];
  cover:string;
}
