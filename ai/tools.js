export const functions = [
    {
        type : "function",
        function : {
            name : "get_paper",
            description : "get the paper from arxiv",
            parameters : {
                type : "object",
                properties :{
                    paper_name : {
                        type : "string",
                        description : "the name of the paper you want to get"
                        }
                    },  
                required : ["paper_name"]
         }
        }
    }
]